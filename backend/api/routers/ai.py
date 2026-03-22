from fastapi import APIRouter, Depends, HTTPException  # type: ignore
import os
import requests  # type: ignore
from core.supabase_provider import supabase  # type: ignore
from core.dependencies import get_current_user  # type: ignore

import pydantic  # type: ignore
from typing import List, Optional, Dict, Any, cast
import json

from core.github_utils import verify_github_skills  # type: ignore
from core.gemini_utils import parse_resume_with_gemini  # type: ignore
from core.resume_utils import extract_text_from_resume_url, summarize_resume_source  # type: ignore
from core.ai_utils import (
    calculate_market_readiness,
    calculate_match_score,
    extract_skills_from_text,
    generate_skills_embedding,
    normalize_skills,
)  # type: ignore

class SuggestSkillsRequest(pydantic.BaseModel):
    title: str
    description: str

router = APIRouter()

class ResumeParseRequest(pydantic.BaseModel):
    resumeText: str


class ResumeFileParseRequest(pydantic.BaseModel):
    resumeUrl: str


def _get_user_role(user_id: str) -> str:
    profile_response = (
        supabase.table("profiles").select("role").eq("id", user_id).single().execute()
    )
    role = (profile_response.data or {}).get("role")
    if not role:
        raise HTTPException(status_code=403, detail="User profile not found")
    return role


def _safe_float(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _derive_cgpa(parsed: Dict[str, Any], existing_cgpa: Any) -> float:
    if existing_cgpa not in (None, ""):
        return _safe_float(existing_cgpa)

    education_rows = parsed.get("education") or []
    if isinstance(education_rows, list):
        for row in education_rows:
            if isinstance(row, dict) and row.get("cgpa") not in (None, ""):
                return _safe_float(row.get("cgpa"))
    return 0.0


def _recommend_resource(skill: str) -> Dict[str, str]:
    normalized = skill.lower()
    curated = {
        "React": {"provider": "Frontend Masters", "level": "Intermediate"},
        "Next.js": {"provider": "Vercel Learn", "level": "Intermediate"},
        "Python": {"provider": "Coursera", "level": "Beginner"},
        "SQL": {"provider": "DataCamp", "level": "Beginner"},
        "Machine Learning": {"provider": "DeepLearning.AI", "level": "Intermediate"},
        "FastAPI": {"provider": "FastAPI Docs", "level": "Intermediate"},
    }
    for key, value in curated.items():
        if key.lower() == normalized:
            return value
    return {"provider": "Curated Learning Path", "level": "Beginner to Intermediate"}


def _extract_internship_skills(row: Dict[str, Any]) -> List[str]:
    explicit_skills = row.get("required_skills")
    if isinstance(explicit_skills, list) and explicit_skills:
        return normalize_skills(cast(List[str], explicit_skills))

    fallback_text = "\n".join(
        [
            str(row.get("title") or ""),
            str(row.get("description") or ""),
        ]
    ).strip()
    return extract_skills_from_text(fallback_text)


def _fetch_internship_rows(active_only: bool = True) -> List[Dict[str, Any]]:
    query = supabase.table("internships").select("*")
    if active_only:
        query = query.eq("is_active", True).eq("is_approved", True)
    response = query.execute()
    return cast(List[Dict[str, Any]], response.data or [])


def _rank_internships_for_student(
    student_skills: List[str],
    student_vector: List[float],
    internship_rows: List[Dict[str, Any]],
    all_internships_skills: List[List[str]],
) -> List[Dict[str, Any]]:
    student_skill_keys = {skill.lower() for skill in normalize_skills(student_skills)}
    ranked: List[Dict[str, Any]] = []

    for row in internship_rows:
        required_skills = _extract_internship_skills(row)
        matched_skills = [
            skill for skill in required_skills if skill.lower() in student_skill_keys
        ]
        missing_skills = [
            skill for skill in required_skills if skill.lower() not in student_skill_keys
        ]
        score = calculate_match_score(
            student_vector=student_vector,
            internship_vector=cast(List[float], row.get("skill_vector") or []),
            student_skills=student_skills,
            required_skills=required_skills,
            all_internships_skills=all_internships_skills,
        )

        ranked.append(
            {
                "id": row.get("id"),
                "title": row.get("title") or "Internship",
                "score": round(score * 100, 2),
                "matchedSkills": matched_skills[:3],
                "missingSkills": missing_skills[:3],
            }
        )

    ranked.sort(key=lambda item: cast(float, item["score"]), reverse=True)
    return ranked


def _build_student_copilot(profile: Dict[str, Any], internship_rows: List[Dict[str, Any]], applications: List[Dict[str, Any]]) -> Dict[str, Any]:
    student_skills = normalize_skills(cast(List[str], profile.get("skills") or []))
    student_vector = cast(List[float], profile.get("skill_vector") or [])
    all_market_rows = _fetch_internship_rows(active_only=True)
    all_internships_skills = [_extract_internship_skills(row) for row in all_market_rows]
    ranked_matches = _rank_internships_for_student(
        student_skills=student_skills,
        student_vector=student_vector,
        internship_rows=internship_rows,
        all_internships_skills=all_internships_skills,
    )

    strength_map: Dict[str, int] = {}
    gap_map: Dict[str, int] = {}
    for match in ranked_matches:
        for skill in cast(List[str], match.get("matchedSkills") or []):
            strength_map[skill] = strength_map.get(skill, 0) + 1
        for skill in cast(List[str], match.get("missingSkills") or []):
            gap_map[skill] = gap_map.get(skill, 0) + 1

    strengths = [
        skill for skill, _ in sorted(strength_map.items(), key=lambda item: item[1], reverse=True)
    ][:4]
    top_gaps = [
        skill for skill, _ in sorted(gap_map.items(), key=lambda item: item[1], reverse=True)
    ][:4]

    pending_count = sum(1 for app in applications if app.get("status") == "pending")
    shortlisted_count = sum(1 for app in applications if app.get("status") == "shortlisted")
    interview_count = sum(1 for app in applications if app.get("status") == "interview")
    accepted_count = sum(1 for app in applications if app.get("status") == "accepted")
    strong_match_count = sum(1 for item in ranked_matches if _safe_float(item.get("score")) >= 80)
    ready_now_count = sum(1 for item in ranked_matches if _safe_float(item.get("score")) >= 60)

    action_items: List[Dict[str, str]] = []
    if profile.get("student_verification_status") != "verified":
        action_items.append(
            {
                "title": "Complete college verification",
                "description": "Your college needs to verify your profile before you can apply to live openings.",
                "href": "/student/profile",
                "priority": "high",
            }
        )
    if not profile.get("parsed_resume"):
        action_items.append(
            {
                "title": "Upload your resume",
                "description": "Resume parsing improves skill extraction, market readiness, and recommendation accuracy.",
                "href": "/student/resume",
                "priority": "high",
            }
        )
    if not profile.get("github_username"):
        action_items.append(
            {
                "title": "Connect GitHub for skill proof",
                "description": "Verified repositories increase recruiter trust and strengthen technical matching.",
                "href": "/student/profile",
                "priority": "medium",
            }
        )
    if not profile.get("linkedin_url"):
        action_items.append(
            {
                "title": "Add LinkedIn identity signal",
                "description": "A complete public identity improves profile trust and market-readiness scoring.",
                "href": "/student/profile",
                "priority": "medium",
            }
        )
    if top_gaps:
        action_items.append(
            {
                "title": f"Close the {top_gaps[0]} gap",
                "description": f"{top_gaps[0]} appears in a large share of your best-fit openings right now.",
                "href": "/student/skills",
                "priority": "medium",
            }
        )
    if not applications and ranked_matches:
        action_items.append(
            {
                "title": "Apply to your top matches",
                "description": "Your profile already aligns with active openings. Converting fit into applications is the fastest win.",
                "href": "/student/internships",
                "priority": "high",
            }
        )
    if pending_count > 0:
        action_items.append(
            {
                "title": "Track application momentum",
                "description": f"You have {pending_count} pending application{'s' if pending_count != 1 else ''}. Keep your profile fresh while recruiters review.",
                "href": "/student/applications",
                "priority": "low",
            }
        )

    readiness_score = profile.get("market_readiness_score")
    if readiness_score in (None, ""):
        readiness_score = calculate_market_readiness(
            student_skills=student_skills,
            all_internships_skills=all_internships_skills,
            cgpa=_safe_float(profile.get("cgpa")),
            has_resume=bool(profile.get("parsed_resume")),
            has_github=bool(profile.get("github_username")),
            has_linkedin=bool(profile.get("linkedin_url")),
        )

    if internship_rows and ranked_matches:
        top_titles = [cast(str, item["title"]) for item in ranked_matches[:3]]
        summary = (
            f"You're currently strongest for {top_titles[0]}"
            + (f" and {top_titles[1]}" if len(top_titles) > 1 else "")
            + (
                f". Adding {top_gaps[0]} would unlock more of the market."
                if top_gaps
                else ". Your strongest signal is already aligned with live demand."
            )
        )
    elif profile.get("college_id"):
        summary = "No approved internships are live for your college right now. Keep your AI profile complete so you are ready the moment new roles open."
    else:
        summary = "Select your college and complete your profile to activate tailored internship recommendations."

    next_milestone = min(
        99,
        int(_safe_float(readiness_score) + (8 if top_gaps else 4) + (5 if not profile.get("github_username") else 0)),
    )

    return {
        "summary": summary,
        "readinessScore": int(_safe_float(readiness_score)),
        "nextMilestoneScore": next_milestone,
        "readyNowCount": ready_now_count,
        "strongMatchCount": strong_match_count,
        "strengths": strengths,
        "topGaps": top_gaps,
        "topMatches": ranked_matches[:3],
        "roleFocus": [cast(str, item["title"]) for item in ranked_matches[:3]],
        "signals": {
            "resume": bool(profile.get("parsed_resume")),
            "github": bool(profile.get("github_username")),
            "linkedin": bool(profile.get("linkedin_url")),
            "verification": profile.get("student_verification_status") == "verified",
        },
        "momentum": {
            "pendingApplications": pending_count,
            "shortlisted": shortlisted_count,
            "interviews": interview_count,
            "accepted": accepted_count,
        },
        "actions": action_items[:4],
    }


def _build_company_copilot(profile: Dict[str, Any], internships: List[Dict[str, Any]], applications: List[Dict[str, Any]]) -> Dict[str, Any]:
    internship_ids = [str(item.get("id")) for item in internships if item.get("id")]
    internship_map = {str(item.get("id")): item for item in internships if item.get("id")}

    student_ids = sorted(
        {
            str(app.get("student_id"))
            for app in applications
            if app.get("student_id")
        }
    )
    student_rows: List[Dict[str, Any]] = []
    if student_ids:
        student_res = (
            supabase.table("profiles")
            .select("id, skills")
            .in_("id", student_ids)
            .execute()
        )
        student_rows = cast(List[Dict[str, Any]], student_res.data or [])
    student_skills_map = {
        str(row.get("id")): normalize_skills(cast(List[str], row.get("skills") or []))
        for row in student_rows
    }

    pipeline = {
        "pending": sum(1 for app in applications if app.get("status") == "pending"),
        "shortlisted": sum(1 for app in applications if app.get("status") == "shortlisted"),
        "interviews": sum(1 for app in applications if app.get("status") == "interview"),
        "accepted": sum(1 for app in applications if app.get("status") == "accepted"),
    }

    hot_skill_map: Dict[str, int] = {}
    supply_gap_map: Dict[str, int] = {}
    watchlist: List[Dict[str, Any]] = []
    strong_candidates = 0

    for internship in internships:
        internship_id = str(internship.get("id"))
        internship_apps = [app for app in applications if str(app.get("internship_id")) == internship_id]
        required_skills = _extract_internship_skills(internship)
        avg_score = 0.0
        if internship_apps:
            avg_score = sum(_safe_float(app.get("match_score")) for app in internship_apps) / len(internship_apps)

        for skill in required_skills:
            hot_skill_map[skill] = hot_skill_map.get(skill, 0) + 1

        applicant_skill_keys = {
            skill.lower()
            for app in internship_apps
            for skill in student_skills_map.get(str(app.get("student_id")), [])
        }
        for skill in required_skills:
            if skill.lower() not in applicant_skill_keys:
                supply_gap_map[skill] = supply_gap_map.get(skill, 0) + 1

        strong_for_role = sum(1 for app in internship_apps if _safe_float(app.get("match_score")) >= 0.75)
        strong_candidates += strong_for_role

        reason = ""
        if not internship_apps:
            reason = "No applicants yet. Broaden the role copy, stipend, or college targeting."
        elif avg_score < 0.45:
            reason = "Applicant quality is low. Refine the skill stack or improve the role narrative."
        elif strong_for_role > 0 and pipeline["interviews"] == 0:
            reason = "Strong candidates are available. Schedule interviews before the pipeline cools."
        elif sum(1 for app in internship_apps if app.get("status") == "pending") >= 4:
            reason = "You have a review backlog on this role."

        if reason:
            watchlist.append(
                {
                    "title": internship.get("title") or "Internship",
                    "reason": reason,
                    "href": f"/company/candidates?internship_id={internship_id}",
                }
            )

    total_applications = len(applications)
    scores = [_safe_float(app.get("match_score")) for app in applications if app.get("match_score") is not None]
    avg_match_score = int(round((sum(scores) / len(scores)) * 100)) if scores else 0

    hiring_health = 20
    if internships:
        hiring_health += 20
    if profile.get("is_verified"):
        hiring_health += 15
    hiring_health += min(total_applications * 3, 15)
    hiring_health += min(strong_candidates * 4, 20)
    hiring_health += min(avg_match_score // 4, 20)
    hiring_health = min(99, hiring_health)

    urgent_actions: List[Dict[str, str]] = []
    if not profile.get("is_verified"):
        urgent_actions.append(
            {
                "title": "Finish company verification",
                "description": "Verified partners convert better because students trust the brand and access improves.",
                "href": "/company",
                "priority": "high",
            }
        )
    if not internships:
        urgent_actions.append(
            {
                "title": "Launch your first internship",
                "description": "The AI funnel starts only after a live internship exists in the system.",
                "href": "/company/internships/new",
                "priority": "high",
            }
        )
    if watchlist:
        urgent_actions.append(
            {
                "title": "Resolve the top hiring blocker",
                "description": watchlist[0]["reason"],
                "href": watchlist[0]["href"],
                "priority": "high",
            }
        )
    if pipeline["pending"] > 0:
        urgent_actions.append(
            {
                "title": "Review pending applicants",
                "description": f"You have {pipeline['pending']} application{'s' if pipeline['pending'] != 1 else ''} waiting for a decision.",
                "href": "/company/candidates",
                "priority": "medium",
            }
        )
    if avg_match_score < 55 and internships:
        urgent_actions.append(
            {
                "title": "Recalibrate role requirements",
                "description": "Lower-fit applicants usually mean the role copy or must-have skills are too narrow for the current student market.",
                "href": "/company/internships",
                "priority": "medium",
            }
        )

    hot_skills = [
        skill for skill, _ in sorted(hot_skill_map.items(), key=lambda item: item[1], reverse=True)
    ][:5]
    supply_gaps = [
        skill for skill, _ in sorted(supply_gap_map.items(), key=lambda item: item[1], reverse=True)
    ][:5]

    if not internships:
        summary = "Your AI hiring engine is idle right now. Publish a role to start ranking candidates and learning market demand."
    elif total_applications == 0:
        summary = "Your roles are live, but the funnel is still cold. Tighten your pitch, stipend, or college reach to improve discovery."
    elif strong_candidates > 0:
        summary = f"You already have {strong_candidates} strong-fit candidate{'s' if strong_candidates != 1 else ''} in the pipeline. Fast review will improve conversion."
    else:
        summary = "Applications are flowing, but the fit can improve. Adjust the role narrative and required skills to sharpen your candidate mix."

    return {
        "summary": summary,
        "hiringHealthScore": hiring_health,
        "avgMatchScore": avg_match_score,
        "strongCandidates": strong_candidates,
        "pipeline": pipeline,
        "hotSkills": hot_skills,
        "supplyGaps": supply_gaps,
        "watchlist": watchlist[:3],
        "actions": urgent_actions[:4],
    }


def _build_admin_copilot() -> Dict[str, Any]:
    student_rows = cast(
        List[Dict[str, Any]],
        (
            supabase.table("profiles")
            .select("id, skills, student_verification_status")
            .eq("role", "student")
            .execute()
        ).data
        or [],
    )
    company_rows = cast(
        List[Dict[str, Any]],
        (
            supabase.table("profiles")
            .select("id, company_name, full_name, is_verified")
            .eq("role", "company")
            .execute()
        ).data
        or [],
    )
    internship_rows = cast(List[Dict[str, Any]], (_fetch_internship_rows(active_only=False) or []))
    application_rows = cast(
        List[Dict[str, Any]],
        (supabase.table("applications").select("status, match_score").execute().data or []),
    )
    log_rows = cast(
        List[Dict[str, Any]],
        (
            supabase.table("activity_logs")
            .select("action")
            .order("created_at", desc=True)
            .limit(200)
            .execute()
        ).data
        or [],
    )

    pending_companies = sum(1 for row in company_rows if row.get("is_verified") is False)
    pending_students = sum(
        1
        for row in student_rows
        if (row.get("student_verification_status") or "pending") == "pending"
    )
    pending_internships = sum(1 for row in internship_rows if row.get("is_approved") is False)
    live_internships = sum(
        1
        for row in internship_rows
        if row.get("is_approved") is True and row.get("is_active") is True
    )
    approval_backlog = pending_companies + pending_students + pending_internships

    scores = [
        _safe_float(row.get("match_score"))
        for row in application_rows
        if row.get("match_score") is not None
    ]
    avg_match_score = int(round((sum(scores) / len(scores)) * 100)) if scores else 0

    trust_flags = sum(
        1
        for row in log_rows
        if str(row.get("action") or "")
        in {
            "company_rejected",
            "student_rejected",
            "company_request_rejected",
        }
    )

    hot_skill_map: Dict[str, int] = {}
    for internship in internship_rows:
        if not internship.get("is_approved"):
            continue
        for skill in _extract_internship_skills(internship):
            hot_skill_map[skill] = hot_skill_map.get(skill, 0) + 1
    hot_skills = [
        skill for skill, _ in sorted(hot_skill_map.items(), key=lambda item: item[1], reverse=True)
    ][:5]

    system_health = 45
    system_health += min(live_internships * 2, 16)
    system_health += min(avg_match_score // 5, 18)
    system_health += 8 if trust_flags == 0 else 0
    system_health -= min(approval_backlog * 2, 25)
    system_health = min(99, max(12, system_health))

    actions: List[Dict[str, str]] = []
    if pending_companies > 0:
        actions.append(
            {
                "title": "Clear company verification backlog",
                "description": f"{pending_companies} compan{'ies' if pending_companies != 1 else 'y'} are waiting for an approval decision.",
                "href": "/admin/companies",
                "priority": "high",
            }
        )
    if pending_internships > 0:
        actions.append(
            {
                "title": "Review internship approvals",
                "description": f"{pending_internships} internship posting{'s' if pending_internships != 1 else ''} are blocked from student visibility.",
                "href": "/admin/internships",
                "priority": "high",
            }
        )
    if pending_students > 0:
        actions.append(
            {
                "title": "Reduce student verification lag",
                "description": f"{pending_students} student profile{'s' if pending_students != 1 else ''} are still waiting on a college decision.",
                "href": "/admin/users",
                "priority": "medium",
            }
        )
    if trust_flags > 0:
        actions.append(
            {
                "title": "Investigate trust signals",
                "description": f"{trust_flags} recent rejection or trust-related events need a platform review.",
                "href": "/admin/fraud",
                "priority": "medium",
            }
        )
    if not actions:
        actions.append(
            {
                "title": "Monitor audit health",
                "description": "Core approvals are flowing well. Keep an eye on audit logs and fraud checks as volume grows.",
                "href": "/admin/logs",
                "priority": "low",
            }
        )

    watchlist: List[Dict[str, str]] = []
    if pending_companies > 0:
        watchlist.append(
            {
                "title": "Company queue is slowing activation",
                "reason": "Pending companies cannot fully participate in the ecosystem until verification clears.",
                "href": "/admin/companies",
            }
        )
    if pending_internships > 0:
        watchlist.append(
            {
                "title": "Internship approvals are blocking supply",
                "reason": "Unapproved internships reduce live demand and slow student/application momentum.",
                "href": "/admin/internships",
            }
        )
    if trust_flags > 0:
        watchlist.append(
            {
                "title": "Trust incidents detected in recent activity",
                "reason": "Review fraud signals and rejected verifications before they become platform reputation issues.",
                "href": "/admin/fraud",
            }
        )

    if approval_backlog == 0 and trust_flags == 0:
        summary = "Platform operations look clean right now. Verification queues are controlled and trust signals are stable."
    elif trust_flags > 0:
        summary = "The platform is growing, but trust signals need closer review. Resolve high-risk cases quickly to keep confidence high."
    else:
        summary = f"The ecosystem is healthy, but {approval_backlog} approval item{'s' if approval_backlog != 1 else ''} are slowing marketplace velocity."

    return {
        "summary": summary,
        "systemHealthScore": system_health,
        "approvalBacklog": approval_backlog,
        "avgMatchScore": avg_match_score,
        "trustFlags": trust_flags,
        "hotSkills": hot_skills,
        "queues": {
            "companies": pending_companies,
            "students": pending_students,
            "internships": pending_internships,
        },
        "actions": actions[:4],
        "watchlist": watchlist[:3],
    }


def _build_tpo_copilot(tpo_id: str) -> Dict[str, Any]:
    student_rows = cast(
        List[Dict[str, Any]],
        (
            supabase.table("profiles")
            .select("id, skills, market_readiness_score, student_verification_status")
            .eq("role", "student")
            .eq("college_id", tpo_id)
            .execute()
        ).data
        or [],
    )
    student_ids = [str(row.get("id")) for row in student_rows if row.get("id")]

    application_rows: List[Dict[str, Any]] = []
    if student_ids:
        application_rows = cast(
            List[Dict[str, Any]],
            (
                supabase.table("applications")
                .select("status, internship_id, student_id")
                .in_("student_id", student_ids)
                .execute()
            ).data
            or [],
        )

    internship_rows = cast(
        List[Dict[str, Any]],
        (
            supabase.table("internships")
            .select("*")
            .eq("college_id", tpo_id)
            .execute()
        ).data
        or [],
    )
    pending_company_requests = cast(
        List[Dict[str, Any]],
        (
            supabase.table("college_company_requests")
            .select("id, status")
            .eq("college_id", tpo_id)
            .eq("status", "pending")
            .execute()
        ).data
        or [],
    )

    student_count = len(student_rows)
    readiness_scores = [
        _safe_float(row.get("market_readiness_score"))
        for row in student_rows
        if row.get("market_readiness_score") is not None
    ]
    avg_readiness = int(round(sum(readiness_scores) / len(readiness_scores))) if readiness_scores else 0
    ready_students = sum(1 for score in readiness_scores if score >= 70)
    pending_students = sum(
        1
        for row in student_rows
        if (row.get("student_verification_status") or "pending") == "pending"
    )
    pending_internships = sum(1 for row in internship_rows if row.get("is_approved") is False)
    active_pipeline = sum(
        1 for row in application_rows if row.get("status") in {"pending", "shortlisted", "interview"}
    )
    placed_students = sum(1 for row in application_rows if row.get("status") == "accepted")

    skill_counts: Dict[str, int] = {}
    for student in student_rows:
        for skill in normalize_skills(cast(List[str], student.get("skills") or [])):
            skill_counts[skill] = skill_counts.get(skill, 0) + 1

    demand_counts: Dict[str, int] = {}
    approved_internships = [
        row for row in internship_rows if row.get("is_approved") is True and row.get("is_active") is True
    ]
    for internship in approved_internships:
        for skill in _extract_internship_skills(internship):
            demand_counts[skill] = demand_counts.get(skill, 0) + 1

    gap_scores: List[Dict[str, Any]] = []
    total_roles = max(1, len(approved_internships))
    total_students = max(1, student_count)
    tracked_skills = set(demand_counts.keys()) | set(skill_counts.keys())
    for skill in tracked_skills:
        demand_pct = demand_counts.get(skill, 0) / total_roles
        proficiency_pct = skill_counts.get(skill, 0) / total_students
        gap = round((demand_pct - proficiency_pct) * 100, 1)
        gap_scores.append(
            {
                "skill": skill,
                "gap": gap,
                "demandPct": round(demand_pct * 100),
                "proficiencyPct": round(proficiency_pct * 100),
            }
        )

    critical_gaps = [
        row["skill"]
        for row in sorted(gap_scores, key=lambda item: item["gap"], reverse=True)
        if row["gap"] > 0
    ][:5]
    strengths = [
        row["skill"]
        for row in sorted(gap_scores, key=lambda item: item["proficiencyPct"], reverse=True)
    ][:5]

    approval_queue = pending_students + len(pending_company_requests) + pending_internships
    placement_rate = round((placed_students / total_students) * 100, 1) if student_count > 0 else 0.0

    batch_health = 30
    batch_health += min(avg_readiness // 4, 20)
    batch_health += min(ready_students * 3, 18)
    batch_health += min(int(placement_rate // 4), 18)
    batch_health -= min(approval_queue * 3, 24)
    batch_health = min(99, max(10, batch_health))

    actions: List[Dict[str, str]] = []
    if pending_students > 0:
        actions.append(
            {
                "title": "Verify pending students",
                "description": f"{pending_students} student profile{'s' if pending_students != 1 else ''} still need approval before they can apply.",
                "href": "/tpo/approvals",
                "priority": "high",
            }
        )
    if pending_company_requests:
        actions.append(
            {
                "title": "Review company partnership requests",
                "description": f"{len(pending_company_requests)} compan{'ies' if len(pending_company_requests) != 1 else 'y'} want access to your college talent pool.",
                "href": "/tpo/approvals",
                "priority": "high",
            }
        )
    if pending_internships > 0:
        actions.append(
            {
                "title": "Approve internship postings",
                "description": f"{pending_internships} internship{'s' if pending_internships != 1 else ''} are waiting to go live for students.",
                "href": "/tpo/approvals",
                "priority": "medium",
            }
        )
    if critical_gaps:
        actions.append(
            {
                "title": f"Close the {critical_gaps[0]} training gap",
                "description": f"{critical_gaps[0]} is showing stronger role demand than current student coverage.",
                "href": "/tpo/skills",
                "priority": "medium",
            }
        )
    if not actions:
        actions.append(
            {
                "title": "Maintain placement momentum",
                "description": "Your queues are under control. Keep nudging students to improve profiles and respond quickly to new roles.",
                "href": "/tpo/students",
                "priority": "low",
            }
        )

    watchlist: List[Dict[str, str]] = []
    if critical_gaps:
        watchlist.append(
            {
                "title": f"{critical_gaps[0]} demand is outrunning supply",
                "reason": "Students need targeted upskilling in this area to improve shortlist quality and placement conversion.",
                "href": "/tpo/skills",
            }
        )
    if pending_students > 0:
        watchlist.append(
            {
                "title": "Verification queue is slowing student activation",
                "reason": "Pending student approvals block applications and reduce college response velocity.",
                "href": "/tpo/approvals",
            }
        )
    if pending_internships > 0:
        watchlist.append(
            {
                "title": "Internship approval lag is reducing live demand",
                "reason": "Students cannot see college-targeted roles until those postings are approved.",
                "href": "/tpo/approvals",
            }
        )

    if approval_queue == 0 and critical_gaps:
        summary = f"Your college pipeline is active. The next lift will come from improving student readiness in {critical_gaps[0]}."
    elif approval_queue > 0:
        summary = f"Your placement engine is moving, but {approval_queue} approval item{'s' if approval_queue != 1 else ''} are still slowing student and company activation."
    else:
        summary = "Your college ecosystem is balanced right now. Focus on pushing more students from readiness into placements."

    return {
        "summary": summary,
        "batchHealthScore": batch_health,
        "avgReadiness": avg_readiness,
        "readyStudents": ready_students,
        "placementRate": placement_rate,
        "approvalQueue": approval_queue,
        "activePipeline": active_pipeline,
        "strengths": strengths,
        "criticalGaps": critical_gaps,
        "queues": {
            "students": pending_students,
            "companies": len(pending_company_requests),
            "internships": pending_internships,
        },
        "actions": actions[:4],
        "watchlist": watchlist[:3],
    }


def _analyze_and_store_resume(user_id: str, resume_text: str) -> Dict[str, Any]:
    parsed = parse_resume_with_gemini(resume_text)
    parsed_skills = normalize_skills(parsed.get("skills") or [])
    if not parsed_skills:
        parsed_skills = extract_skills_from_text(resume_text)
        parsed["skills"] = parsed_skills

    skill_vector = generate_skills_embedding(parsed_skills)

    profile_response = (
        supabase.table("profiles")
        .select("full_name, phone, cgpa, github_username, linkedin_url")
        .eq("id", user_id)
        .single()
        .execute()
    )
    profile = profile_response.data or {}

    internship_rows = _fetch_internship_rows(active_only=True)
    all_internships_skills = [_extract_internship_skills(row) for row in internship_rows]

    cgpa_value = _derive_cgpa(parsed, profile.get("cgpa"))
    market_readiness_score = calculate_market_readiness(
        student_skills=parsed_skills,
        all_internships_skills=all_internships_skills,
        cgpa=cgpa_value,
        has_resume=True,
        has_github=bool(profile.get("github_username")),
        has_linkedin=bool(profile.get("linkedin_url")),
    )

    update_payload: Dict[str, Any] = {
        "parsed_resume": parsed,
        "skills": parsed_skills,
        "skill_vector": skill_vector,
        "market_readiness_score": market_readiness_score,
    }
    if parsed.get("full_name") and not profile.get("full_name"):
        update_payload["full_name"] = parsed["full_name"]
    if parsed.get("phone") and not profile.get("phone"):
        update_payload["phone"] = parsed["phone"]
    if cgpa_value > 0 and not profile.get("cgpa"):
        update_payload["cgpa"] = cgpa_value

    supabase.table("profiles").update(update_payload).eq("id", user_id).execute()

    try:
        supabase.table("skill_vectors").upsert({
            "reference_id": user_id,
            "reference_type": "student",
            "skills_text": ", ".join(parsed_skills),
            "vector": skill_vector
        }, on_conflict="reference_id,reference_type").execute()
    except Exception:
        pass

    try:
        supabase.table("activity_logs").insert({
            "user_id": user_id,
            "action": "resume_parsed",
            "details": {
                "skills_count": len(parsed_skills),
                "market_readiness_score": market_readiness_score,
            }
        }).execute()
    except Exception:
        pass

    return {
        "parsed": parsed,
        "skill_vector": skill_vector,
        "market_readiness_score": market_readiness_score,
        "parsed_skills": parsed_skills,
    }

@router.post("/parse-resume")
async def parse_resume(body: ResumeParseRequest, user = Depends(get_current_user)):
    try:
        analysis = _analyze_and_store_resume(user.id, body.resumeText)

        return {
            "success": True, 
            "data": analysis["parsed"],
            "skillVector": len(analysis["skill_vector"]),
            "marketReadinessScore": analysis["market_readiness_score"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse-resume-file")
async def parse_resume_file(body: ResumeFileParseRequest, user = Depends(get_current_user)):
    try:
        resume_text = extract_text_from_resume_url(body.resumeUrl)
        if not resume_text.strip():
            raise HTTPException(
                status_code=400,
                detail="The uploaded resume could not be read. Please upload a clearer PDF or DOCX file.",
            )

        analysis = _analyze_and_store_resume(user.id, resume_text)
        return {
            "success": True,
            "data": analysis["parsed"],
            "skillVector": len(analysis["skill_vector"]),
            "marketReadinessScore": analysis["market_readiness_score"],
            "source": summarize_resume_source(body.resumeUrl),
        }
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class GitHubVerifyRequest(pydantic.BaseModel):
    githubUsername: Optional[str] = None
    claimedSkills: List[str]

@router.post("/github-verify")
async def github_verify(body: GitHubVerifyRequest, user = Depends(get_current_user)):
    try:
        profile_response = (
            supabase.table("profiles")
            .select("github_username, skills, cgpa, parsed_resume, linkedin_url")
            .eq("id", user.id)
            .single()
            .execute()
        )
        profile = profile_response.data or {}
        github_username = profile.get("github_username") or body.githubUsername

        if not github_username:
            raise HTTPException(status_code=400, detail="Connect your GitHub account first")

        verification = await verify_github_skills(str(github_username), body.claimedSkills)
        
        # Store verification result in Supabase (Resilient to missing table)
        try:
            supabase.table("verifications").upsert({
                "profile_id": user.id,
                "type": "skill",
                "status": "rejected" if verification["isSuspicious"] else "verified",
                "notes": json.dumps({
                    "verified": verification["verifiedSkills"],
                    "unverified": verification["unverifiedSkills"],
                    "reasons": verification["suspiciousReasons"]
                })
            }).execute()
        except Exception as db_err:
            print(f"Database error writing to verifications: {db_err}")
            # Non-blocking error
        
        # Log activity (Resilient to missing table)
        try:
            supabase.table("activity_logs").insert({
                "user_id": user.id,
                "action": "github_verified",
                "details": {
                    "username": github_username,
                    "suspicious": verification["isSuspicious"],
                    "verified_count": len(verification["verifiedSkills"])
                }
            }).execute()
        except Exception as db_err:
            print(f"Database error writing to activity_logs: {db_err}")
            # Non-blocking error

        internship_rows = _fetch_internship_rows(active_only=True)
        market_readiness_score = calculate_market_readiness(
            student_skills=normalize_skills(profile.get("skills") or []),
            all_internships_skills=[_extract_internship_skills(row) for row in internship_rows],
            cgpa=_safe_float(profile.get("cgpa")),
            has_resume=bool(profile.get("parsed_resume")),
            has_github=True,
            has_linkedin=bool(profile.get("linkedin_url")),
        )
        try:
            supabase.table("profiles").update({
                "market_readiness_score": market_readiness_score
            }).eq("id", user.id).execute()
        except Exception:
            pass

        return {"success": True, "data": {**verification, "marketReadinessScore": market_readiness_score}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/skill-gaps")
async def get_skill_gaps(user = Depends(get_current_user)):
    try:
        # Fetch user profile
        profile_response = (
            supabase.table("profiles").select("*").eq("id", user.id).single().execute()
        )
        profile = profile_response.data or {}

        user_skills = normalize_skills(cast(List[str], profile.get("skills") or []))
        user_skills_set = {skill.lower() for skill in user_skills}

        internships = _fetch_internship_rows(active_only=True)

        match_count: int = 0
        missing_map: Dict[str, int] = {}
        market_demand_map: Dict[str, int] = {}

        for internship in internships:
            normalized_required_skills = _extract_internship_skills(internship)
            if not normalized_required_skills:
                continue

            has_enough_skills = True
            for skill in normalized_required_skills:
                market_demand_map[skill] = market_demand_map.get(skill, 0) + 1
                if skill.lower() not in user_skills_set:
                    has_enough_skills = False
                    missing_map[skill] = missing_map.get(skill, 0) + 1

            if has_enough_skills:
                match_count += 1

        missing_items = sorted(missing_map.items(), key=lambda item: item[1], reverse=True)
        top_missing = missing_items[:4]
        gaps_obj = {
            "missing": [m[0] for m in top_missing],
            "market_count": dict(top_missing)
        }

        demand_items = sorted(market_demand_map.items(), key=lambda item: item[1], reverse=True)
        top_industry_base = demand_items[:4]
        top_industry = []
        for skill_count_tuple in top_industry_base:
            skill = skill_count_tuple[0]
            count = skill_count_tuple[1]
            demand = "Medium"
            if count > 5: demand = "Very High"
            elif count > 2: demand = "High"
            
            top_industry.append({
                "skill": skill,
                "trend": "up",
                "demand": demand
            })

        score = calculate_market_readiness(
            student_skills=user_skills,
            all_internships_skills=[_extract_internship_skills(row) for row in internships],
            cgpa=_safe_float(profile.get("cgpa")),
            has_resume=bool(profile.get("parsed_resume")),
            has_github=bool(profile.get("github_username")),
            has_linkedin=bool(profile.get("linkedin_url")),
        )

        recommendations = []
        for skill_item in top_missing:
            skill = skill_item[0]
            resource = _recommend_resource(skill)
            recommendations.append({
                "title": f"Improve {skill} for better internship fit",
                "provider": resource["provider"],
                "level": resource["level"],
                "link": "#"
            })

        if not recommendations:
            recommendations.append({
                "title": "Keep building deeper projects with your current stack",
                "provider": "Project-based learning",
                "level": "Intermediate",
                "link": "#"
            })

        try:
            supabase.table("profiles").update({
                "market_readiness_score": score
            }).eq("id", user.id).execute()
        except Exception:
            pass

        return {
            "success": True,
            "data": {
                "readinessScore": score,
                "matchCount": match_count,
                "topSkills": user_skills[:5],
                "gaps": gaps_obj,
                "recommendations": recommendations,
                "industryDemand": top_industry
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student-copilot")
async def get_student_copilot(user=Depends(get_current_user)):
    try:
        role = _get_user_role(user.id)
        if role != "student":
            raise HTTPException(status_code=403, detail="Student copilot is only available to students")

        profile_response = (
            supabase.table("profiles")
            .select("id, full_name, skills, skill_vector, parsed_resume, github_username, linkedin_url, market_readiness_score, college_id, student_verification_status, cgpa")
            .eq("id", user.id)
            .single()
            .execute()
        )
        profile = cast(Dict[str, Any], profile_response.data or {})
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

        internships = _fetch_internship_rows(active_only=True)
        college_id = profile.get("college_id")
        if college_id:
            internships = [row for row in internships if row.get("college_id") == college_id]
        else:
            internships = []

        applications_response = (
            supabase.table("applications")
            .select("id, status, internship_id, match_score")
            .eq("student_id", user.id)
            .order("created_at", desc=True)
            .execute()
        )
        applications = cast(List[Dict[str, Any]], applications_response.data or [])

        copilot = _build_student_copilot(profile, internships, applications)
        return {"success": True, "data": copilot}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/company-copilot")
async def get_company_copilot(user=Depends(get_current_user)):
    try:
        role = _get_user_role(user.id)
        if role != "company":
            raise HTTPException(status_code=403, detail="Company copilot is only available to company accounts")

        profile_response = (
            supabase.table("profiles")
            .select("id, company_name, full_name, is_verified")
            .eq("id", user.id)
            .single()
            .execute()
        )
        profile = cast(Dict[str, Any], profile_response.data or {})
        if not profile:
            raise HTTPException(status_code=404, detail="Company profile not found")

        internships_response = (
            supabase.table("internships")
            .select("*")
            .eq("company_id", user.id)
            .order("created_at", desc=True)
            .execute()
        )
        internships = cast(List[Dict[str, Any]], internships_response.data or [])
        internship_ids = [row.get("id") for row in internships if row.get("id")]

        applications: List[Dict[str, Any]] = []
        if internship_ids:
            applications_response = (
                supabase.table("applications")
                .select("*")
                .in_("internship_id", internship_ids)
                .order("created_at", desc=True)
                .execute()
            )
            applications = cast(List[Dict[str, Any]], applications_response.data or [])

        copilot = _build_company_copilot(profile, internships, applications)
        return {"success": True, "data": copilot}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin-copilot")
async def get_admin_copilot(user=Depends(get_current_user)):
    try:
        role = _get_user_role(user.id)
        if role != "admin":
            raise HTTPException(status_code=403, detail="Admin copilot is only available to admins")

        return {"success": True, "data": _build_admin_copilot()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tpo-copilot")
async def get_tpo_copilot(user=Depends(get_current_user)):
    try:
        role = _get_user_role(user.id)
        if role not in {"tpo", "college", "college_tpo"}:
            raise HTTPException(status_code=403, detail="TPO copilot is only available to college/TPO accounts")

        return {"success": True, "data": _build_tpo_copilot(user.id)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggest-skills")
async def suggest_skills(req: SuggestSkillsRequest, user = Depends(get_current_user)):
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        fallback_skills = extract_skills_from_text(f"{req.title}\n{req.description}", limit=10)
        if not api_key:
            return {"success": True, "skills": fallback_skills}

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
        prompt = f"""
        Based on the following internship title and description, suggest a list of 5-10 specific technical skills, frameworks, or languages required.
        Return ONLY a JSON array of strings.
        
        Title: {req.title}
        Description: {req.description}
        """
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        
        # import requests
        response = requests.post(url, json=payload, timeout=30)
        if response.status_code != 200:
            return {"success": True, "skills": fallback_skills}
            
        result = response.json()
        text = result["candidates"][0]["content"]["parts"][0]["text"]
        
        # Simple extraction
        import json
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        skills = normalize_skills(json.loads(text))
        if not skills:
            skills = fallback_skills
        return {"success": True, "skills": skills}
    except Exception as e:
        return {"success": True, "skills": extract_skills_from_text(f"{req.title}\n{req.description}", limit=10), "error": str(e)}

@router.get("/recommend-candidates/{internship_id}")
async def recommend_candidates(internship_id: str, user = Depends(get_current_user)):
    try:
        role = _get_user_role(user.id)
        if role not in {"company", "admin", "tpo"}:
            raise HTTPException(status_code=403, detail="You do not have access to recommendations")

        internship_res = (
            supabase.table("internships").select("*").eq("id", internship_id).single().execute()
        )
        internship = internship_res.data
        if not internship:
            raise HTTPException(status_code=404, detail="Internship not found")

        if role == "company" and internship.get("company_id") != user.id:
            raise HTTPException(status_code=403, detail="This internship does not belong to your company")
        if role == "tpo" and internship.get("college_id") != user.id:
            raise HTTPException(status_code=403, detail="This internship is not assigned to your college")

        students_query = (
            supabase.table("profiles")
            .select("id, full_name, email, skills, avatar_url, college_id, student_verification_status, skill_vector")
            .eq("role", "student")
            .eq("student_verification_status", "verified")
            .not_.is_("skill_vector", "null")
        )
        if internship.get("college_id"):
            students_query = students_query.eq("college_id", internship.get("college_id"))

        students_res = students_query.execute()
        students = students_res.data or []

        all_internships = _fetch_internship_rows(active_only=False)
        all_internships_skills = [_extract_internship_skills(i) for i in all_internships]

        required_skills = _extract_internship_skills(cast(Dict[str, Any], internship))
        recommendations: List[Dict[str, Any]] = []
        for student in students:
            student_skills = normalize_skills(student.get("skills") or [])
            score = calculate_match_score(
                student_vector=student.get("skill_vector") or [],
                internship_vector=internship.get("skill_vector") or [],
                student_skills=student_skills,
                required_skills=required_skills,
                all_internships_skills=all_internships_skills
            )

            if score > 0.25:
                student_skill_keys = {skill.lower() for skill in student_skills}
                matched_skills = [
                    skill for skill in required_skills if skill.lower() in student_skill_keys
                ]
                missing_skills = [
                    skill for skill in required_skills if skill.lower() not in student_skill_keys
                ]
                recommendations.append({
                    "id": student["id"],
                    "full_name": student["full_name"],
                    "email": student["email"],
                    "score": round(score * 100, 2),
                    "skills": student_skills,
                    "matchedSkills": matched_skills,
                    "missingSkills": missing_skills[:3],
                    "avatar_url": student.get("avatar_url")
                })

        recommendations.sort(key=lambda item: item["score"], reverse=True)
        top_recommendations = recommendations[:20]

        return {"success": True, "data": top_recommendations}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
