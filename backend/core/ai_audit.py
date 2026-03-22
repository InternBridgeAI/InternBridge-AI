from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from core.supabase_provider import supabase

AI_PROMPT_VERSIONS: Dict[str, str] = {
    "resume_parse": "resume-parse-v2",
    "resume_parse_file": "resume-file-parse-v2",
    "github_verify": "github-verification-v2",
    "skill_gaps": "skill-gap-v2",
    "student_roadmap": "student-roadmap-v1",
    "application_pitch": "application-pitch-v1",
    "interview_kit": "interview-kit-v1",
    "internship_copilot": "internship-copilot-v1",
    "student_copilot": "student-copilot-v2",
    "company_copilot": "company-copilot-v2",
    "admin_copilot": "admin-copilot-v1",
    "tpo_copilot": "tpo-copilot-v1",
    "suggest_skills": "skill-suggest-v1",
    "recommend_candidates": "candidate-recommend-v2",
}


def _truncate_text(value: str, limit: int = 220) -> str:
    text = value.strip()
    if len(text) <= limit:
        return text
    return f"{text[:limit].rstrip()}..."


def _compact_json(value: Any, depth: int = 2) -> Any:
    if depth <= 0:
        if isinstance(value, (dict, list)):
            return "[truncated]"
        if isinstance(value, str):
            return _truncate_text(value, 120)
        return value

    if isinstance(value, dict):
        compact: Dict[str, Any] = {}
        for index, (key, item) in enumerate(value.items()):
            if index >= 8:
                compact["_remaining_keys"] = max(0, len(value) - 8)
                break
            compact[str(key)] = _compact_json(item, depth - 1)
        return compact

    if isinstance(value, list):
        compact_items = [_compact_json(item, depth - 1) for item in value[:6]]
        if len(value) > 6:
            compact_items.append({"_remaining_items": len(value) - 6})
        return compact_items

    if isinstance(value, str):
        return _truncate_text(value)

    return value


def log_ai_action(
    *,
    action_key: str,
    user_id: Optional[str],
    user_role: Optional[str],
    model_name: str,
    used_fallback: bool,
    success: bool,
    latency_ms: int,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    request_payload: Optional[Dict[str, Any]] = None,
    response_payload: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
) -> None:
    row = {
        "user_id": user_id,
        "user_role": user_role,
        "action_key": action_key,
        "prompt_version": AI_PROMPT_VERSIONS.get(action_key, "unversioned"),
        "model_name": model_name,
        "used_fallback": used_fallback,
        "success": success,
        "latency_ms": max(0, int(latency_ms)),
        "target_type": target_type,
        "target_id": target_id,
        "request_payload": _compact_json(request_payload or {}),
        "response_payload": _compact_json(response_payload or {}),
        "error_message": _truncate_text(str(error_message or ""), 300) or None,
    }

    try:
        supabase.table("ai_action_logs").insert(row).execute()
    except Exception:
        pass


def build_ai_analytics(window_hours: int = 168) -> Dict[str, Any]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=window_hours)
    try:
        response = (
            supabase.table("ai_action_logs")
            .select("id, action_key, prompt_version, model_name, user_role, used_fallback, success, latency_ms, created_at")
            .gte("created_at", cutoff.isoformat())
            .order("created_at", desc=True)
            .limit(500)
            .execute()
        )
        logs = response.data or []
    except Exception:
        logs = []

    total_actions = len(logs)
    successful = sum(1 for row in logs if row.get("success") is True)
    fallbacks = sum(1 for row in logs if row.get("used_fallback") is True)
    avg_latency_ms = round(
        sum(int(row.get("latency_ms") or 0) for row in logs) / max(1, total_actions)
    )

    action_counter = Counter(str(row.get("action_key") or "unknown") for row in logs)
    version_counter = Counter(str(row.get("prompt_version") or "unversioned") for row in logs)
    model_counter = Counter(str(row.get("model_name") or "unknown") for row in logs)

    action_breakdown: List[Dict[str, Any]] = []
    for action, count in action_counter.most_common(6):
        action_rows = [row for row in logs if (row.get("action_key") or "unknown") == action]
        action_breakdown.append(
            {
                "actionKey": action,
                "count": count,
                "successRate": round(
                    sum(1 for row in action_rows if row.get("success") is True)
                    / max(1, len(action_rows))
                    * 100
                ),
                "fallbackRate": round(
                    sum(1 for row in action_rows if row.get("used_fallback") is True)
                    / max(1, len(action_rows))
                    * 100
                ),
            }
        )

    version_breakdown: List[Dict[str, Any]] = []
    for version, count in version_counter.most_common(6):
        last_used = next(
            (row.get("created_at") for row in logs if (row.get("prompt_version") or "unversioned") == version),
            None,
        )
        version_breakdown.append(
            {
                "promptVersion": version,
                "count": count,
                "lastUsed": last_used,
            }
        )

    model_breakdown = [
        {"modelName": model, "count": count}
        for model, count in model_counter.most_common(4)
    ]

    recent_events = [
        {
            "id": row.get("id"),
            "actionKey": row.get("action_key"),
            "promptVersion": row.get("prompt_version"),
            "modelName": row.get("model_name"),
            "userRole": row.get("user_role"),
            "usedFallback": bool(row.get("used_fallback")),
            "success": bool(row.get("success")),
            "latencyMs": int(row.get("latency_ms") or 0),
            "createdAt": row.get("created_at"),
        }
        for row in logs[:8]
    ]

    return {
        "windowHours": window_hours,
        "totalActions": total_actions,
        "successRate": round((successful / max(1, total_actions)) * 100),
        "fallbackRate": round((fallbacks / max(1, total_actions)) * 100),
        "avgLatencyMs": avg_latency_ms,
        "actionBreakdown": action_breakdown,
        "versionBreakdown": version_breakdown,
        "modelBreakdown": model_breakdown,
        "recentEvents": recent_events,
    }
