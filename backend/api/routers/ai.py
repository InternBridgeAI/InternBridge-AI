from fastapi import APIRouter, Depends, HTTPException  # type: ignore
import os
import requests  # type: ignore
import time
from core.supabase_provider import supabase  # type: ignore
from core.dependencies import get_current_user  # type: ignore

import pydantic  # type: ignore
from typing import List, Optional, Dict, Any, cast
import json

from core.ai_audit import build_ai_analytics, log_ai_action  # type: ignore
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


class ApplicationPitchRequest(pydantic.BaseModel):
    internship_id: str


class InterviewKitRequest(pydantic.BaseModel):
    application_id: str


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


def _strip_code_fences(text: str) -> str:
    cleaned = (text or "").strip()
    if cleaned.startswith("```json"):
        return cleaned.split("```json", 1)[1].split("```", 1)[0].strip()
    if cleaned.startswith("```"):
        return cleaned.split("```", 1)[1].split("```", 1)[0].strip()
    return cleaned


def _elapsed_ms(started_at: float) -> int:
    return max(0, int((time.perf_counter() - started_at) * 1000))


def _with_ai_audit(payload: Dict[str, Any], *, model_name: str, used_fallback: bool) -> Dict[str, Any]:
    enriched = dict(payload)
    enriched["_ai_audit"] = {
        "model_name": model_name,
        "used_fallback": used_fallback,
    }
    return enriched


def _extract_ai_audit(payload: Dict[str, Any], default_model: str) -> Dict[str, Any]:
    audit = payload.pop("_ai_audit", None)
    if isinstance(audit, dict):
        return {
            "model_name": str(audit.get("model_name") or default_model),
            "used_fallback": bool(audit.get("used_fallback")),
        }
    return {"model_name": default_model, "used_fallback": False}


def _log_ai_route(
    *,
    action_key: str,
    started_at: float,
    user_id: Optional[str],
    user_role: Optional[str],
    model_name: str,
    used_fallback: bool,
    success: bool,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    request_payload: Optional[Dict[str, Any]] = None,
    response_payload: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
) -> None:
    log_ai_action(
        action_key=action_key,
        user_id=user_id,
        user_role=user_role,
        model_name=model_name,
        used_fallback=used_fallback,
        success=success,
        latency_ms=_elapsed_ms(started_at),
        target_type=target_type,
        target_id=target_id,
        request_payload=request_payload,
        response_payload=response_payload,
        error_message=error_message,
    )


def _generate_structured_json(prompt: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return _with_ai_audit(fallback, model_name="rules-fallback", used_fallback=True)

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-flash:generateContent?key={api_key}"
    )
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        response = requests.post(url, json=payload, timeout=45)
        if response.status_code != 200:
            return _with_ai_audit(fallback, model_name="rules-fallback", used_fallback=True)

        result = response.json()
        candidates = result.get("candidates") or []
        if not candidates:
            return _with_ai_audit(fallback, model_name="rules-fallback", used_fallback=True)

        parts = ((candidates[0].get("content") or {}).get("parts")) or []
        if not parts or not parts[0].get("text"):
            return _with_ai_audit(fallback, model_name="rules-fallback", used_fallback=True)

        parsed = json.loads(_strip_code_fences(parts[0]["text"]))
        if not isinstance(parsed, dict):
            return _with_ai_audit(fallback, model_name="rules-fallback", used_fallback=True)

        merged = dict(fallback)
        merged.update(parsed)
        return _with_ai_audit(merged, model_name="gemini-1.5-flash", used_fallback=False)
    except Exception:
        return _with_ai_audit(fallback, model_name="rules-fallback", used_fallback=True)


def _list_to_text(items: List[str], fallback: str = "your current strengths") -> str:
    cleaned = [item for item in items if item]
    if not cleaned:
        return fallback
    if len(cleaned) == 1:
        return cleaned[0]
    if len(cleaned) == 2:
        return f"{cleaned[0]} and {cleaned[1]}"
    return f"{', '.join(cleaned[:-1])}, and {cleaned[-1]}"


def _confidence_label(score: int) -> str:
    if score >= 82:
        return "Strong fit"
    if score >= 65:
        return "Good fit"
    if score >= 45:
        return "Stretch fit"
    return "Early fit"


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


def _fallback_student_roadmap(profile: Dict[str, Any], copilot: Dict[str, Any]) -> Dict[str, Any]:
    strengths = list(copilot.get("strengths") or [])[:4] or normalize_skills(cast(List[str], profile.get("skills") or []))[:4]
    priority_skills = list(copilot.get("topGaps") or [])[:4]
    role_targets = list(copilot.get("roleFocus") or [])[:3]
    readiness = int(round(_safe_float(profile.get("market_readiness_score"))))

    next_steps: List[Dict[str, str]] = []
    if not profile.get("parsed_resume"):
        next_steps.append({
            "title": "Upload and parse your resume",
            "why": "Resume parsing sharpens skill extraction and recruiter trust.",
            "impact": "Improves matching accuracy and readiness scoring.",
        })
    if not profile.get("github_username"):
        next_steps.append({
            "title": "Connect GitHub evidence",
            "why": "Recruiters trust verified work more than self-declared skills.",
            "impact": "Improves skill proof and interview confidence.",
        })
    for skill in priority_skills[:2]:
        next_steps.append({
            "title": f"Close the {skill} gap",
            "why": f"{skill} appears repeatedly across your strongest-fit roles.",
            "impact": f"Unlocks more shortlist-worthy openings in {', '.join(role_targets[:2]) or 'the current market'}.",
        })
    if not next_steps:
        next_steps.append({
            "title": "Deepen one visible proof project",
            "why": "You already cover the visible market stack. Depth is the next differentiator.",
            "impact": "Raises interview quality and recruiter confidence.",
        })

    seed_skills = priority_skills[:2] or strengths[:2] or ["Problem Solving"]
    primary_target = role_targets[0] if role_targets else "target roles"
    proof_projects = [
        {
            "title": f"{seed_skills[0]} project for {primary_target}",
            "why": f"Turns {seed_skills[0]} into visible proof instead of a profile bullet.",
            "skills": normalize_skills(seed_skills + strengths[:2])[:4],
            "deliverable": "Ship a live demo, short README, and one clear outcome metric.",
        }
    ]
    if len(seed_skills) > 1:
        proof_projects.append(
            {
                "title": f"{seed_skills[1]} workflow challenge",
                "why": f"Shows execution depth in a market-facing skill gap: {seed_skills[1]}.",
                "skills": normalize_skills([seed_skills[1]] + strengths[:2])[:4],
                "deliverable": "Build a small end-to-end feature and explain tradeoffs in 3 bullets.",
            }
        )

    interview_themes = normalize_skills(priority_skills[:2] + strengths[:2])[:4]
    market_advice = [
        f"Anchor your profile around {_list_to_text(strengths[:2], 'one clear strength')} instead of listing too many shallow skills.",
        f"Use {_list_to_text(priority_skills[:2], 'one missing market skill')} as the next learning sprint.",
        "Pair every new skill with a visible project or GitHub proof link.",
    ]

    return {
        "headline": (
            f"Readiness is at {readiness}%."
            + (
                f" The fastest path to stronger shortlist odds is {_list_to_text(priority_skills[:2], 'deeper proof work')}."
                if priority_skills
                else " Your next upgrade is deeper proof of work and sharper applications."
            )
        ),
        "roleTargets": role_targets,
        "prioritySkills": priority_skills,
        "strengths": strengths,
        "nextSteps": next_steps[:4],
        "proofProjects": proof_projects[:3],
        "interviewThemes": interview_themes,
        "marketAdvice": market_advice[:3],
    }


def _build_student_roadmap(profile: Dict[str, Any], copilot: Dict[str, Any]) -> Dict[str, Any]:
    fallback = _fallback_student_roadmap(profile, copilot)
    prompt = f"""
    You are helping a student become interview-ready for internships.
    Return ONLY a JSON object with these keys:
    headline: string
    roleTargets: array of strings
    prioritySkills: array of strings
    strengths: array of strings
    nextSteps: array of objects with title, why, impact
    proofProjects: array of objects with title, why, skills(array), deliverable
    interviewThemes: array of strings
    marketAdvice: array of strings

    Student profile:
    - Skills: {json.dumps(normalize_skills(cast(List[str], profile.get("skills") or [])))}
    - Market readiness: {_safe_float(profile.get("market_readiness_score"))}
    - Verified GitHub: {bool(profile.get("github_username"))}
    - LinkedIn connected: {bool(profile.get("linkedin_url"))}
    - Resume parsed: {bool(profile.get("parsed_resume"))}

    Existing AI context:
    {json.dumps(fallback)}

    Make the plan practical, concise, and outcome-driven.
    """
    result = _generate_structured_json(prompt, fallback)
    result["roleTargets"] = normalize_skills(cast(List[str], result.get("roleTargets") or fallback["roleTargets"]))
    result["prioritySkills"] = normalize_skills(cast(List[str], result.get("prioritySkills") or fallback["prioritySkills"]))
    result["strengths"] = normalize_skills(cast(List[str], result.get("strengths") or fallback["strengths"]))
    result["interviewThemes"] = normalize_skills(cast(List[str], result.get("interviewThemes") or fallback["interviewThemes"]))
    return result


def _fallback_application_pitch(profile: Dict[str, Any], internship: Dict[str, Any]) -> Dict[str, Any]:
    student_skills = normalize_skills(cast(List[str], profile.get("skills") or []))
    required_skills = _extract_internship_skills(internship)
    matched_skills = [skill for skill in required_skills if skill.lower() in {item.lower() for item in student_skills}]
    missing_skills = [skill for skill in required_skills if skill.lower() not in {item.lower() for item in student_skills}]
    all_internships_skills = [_extract_internship_skills(row) for row in _fetch_internship_rows(active_only=True)]
    student_vector = cast(List[float], profile.get("skill_vector") or generate_skills_embedding(student_skills))
    internship_vector = cast(List[float], internship.get("skill_vector") or generate_skills_embedding(required_skills))
    fit_score = int(round(calculate_match_score(
        student_vector=student_vector,
        internship_vector=internship_vector,
        student_skills=student_skills,
        required_skills=required_skills,
        all_internships_skills=all_internships_skills,
    ) * 100))
    summary = str((profile.get("parsed_resume") or {}).get("summary") or "").strip()
    matched_text = _list_to_text(matched_skills[:3], _list_to_text(student_skills[:3], "relevant practical skills"))
    missing_text = missing_skills[0] if missing_skills else ""
    role_title = internship.get("title") or "this internship"
    cover_letter = (
        f"I’m applying for the {role_title} opportunity because my background aligns well with {matched_text}. "
        + (f"{summary} " if summary else "")
        + "I focus on building practical work with clear outcomes, and I can contribute quickly while adapting to the team’s workflow. "
        + (
            f"I already bring visible overlap in {matched_text}, and I’m actively sharpening {missing_text} to close the remaining gap fast. "
            if missing_text
            else "I already cover a strong share of the role’s visible stack and can add value from day one. "
        )
        + "I’d value the chance to discuss how I can contribute with ownership, learning speed, and execution discipline."
    )
    talking_points = [
        f"Relevant overlap: {matched_text}.",
        (
            f"Fastest growth area: {missing_text}."
            if missing_text
            else "Position yourself as ready for immediate execution."
        ),
        "Anchor the conversation in one real project or proof of work.",
    ]
    return {
        "headline": f"{_confidence_label(fit_score)} for {role_title}",
        "fitScore": fit_score,
        "confidenceLabel": _confidence_label(fit_score),
        "matchedSkills": matched_skills[:4],
        "missingSkills": missing_skills[:3],
        "talkingPoints": talking_points,
        "coverLetter": cover_letter.strip(),
    }


def _build_application_pitch(profile: Dict[str, Any], internship: Dict[str, Any]) -> Dict[str, Any]:
    fallback = _fallback_application_pitch(profile, internship)
    prompt = f"""
    You are generating a sharp internship application pitch for a student.
    Return ONLY a JSON object with these keys:
    headline: string
    fitScore: number
    confidenceLabel: string
    matchedSkills: array of strings
    missingSkills: array of strings
    talkingPoints: array of strings
    coverLetter: string

    Student:
    - Name: {profile.get("full_name") or "Student"}
    - Skills: {json.dumps(normalize_skills(cast(List[str], profile.get("skills") or [])))}
    - Resume summary: {json.dumps(str((profile.get("parsed_resume") or {}).get("summary") or ""))}
    - GitHub connected: {bool(profile.get("github_username"))}

    Internship:
    - Title: {internship.get("title") or ""}
    - Description: {internship.get("description") or ""}
    - Required skills: {json.dumps(_extract_internship_skills(internship))}

    Baseline fit context:
    {json.dumps(fallback)}

    Write a concise, non-generic, recruiter-ready pitch. Keep the cover letter under 170 words.
    """
    result = _generate_structured_json(prompt, fallback)
    result["matchedSkills"] = normalize_skills(cast(List[str], result.get("matchedSkills") or fallback["matchedSkills"]))
    result["missingSkills"] = normalize_skills(cast(List[str], result.get("missingSkills") or fallback["missingSkills"]))
    result["fitScore"] = int(round(_safe_float(result.get("fitScore") or fallback["fitScore"])))
    if not result.get("confidenceLabel"):
        result["confidenceLabel"] = _confidence_label(int(result["fitScore"]))
    return result


def _fallback_internship_copilot(
    profile: Dict[str, Any],
    internship: Dict[str, Any],
    application: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    student_skills = normalize_skills(cast(List[str], profile.get("skills") or []))
    required_skills = _extract_internship_skills(internship)
    student_skill_keys = {skill.lower() for skill in student_skills}
    matched_skills = [skill for skill in required_skills if skill.lower() in student_skill_keys]
    missing_skills = [skill for skill in required_skills if skill.lower() not in student_skill_keys]
    fit_score = int(round(calculate_match_score(
        student_vector=cast(List[float], profile.get("skill_vector") or generate_skills_embedding(student_skills)),
        internship_vector=cast(List[float], internship.get("skill_vector") or generate_skills_embedding(required_skills)),
        student_skills=student_skills,
        required_skills=required_skills,
        all_internships_skills=[_extract_internship_skills(row) for row in _fetch_internship_rows(active_only=True)],
    ) * 100))
    confidence = _confidence_label(fit_score)
    company_name = str((internship.get("company") or {}).get("company_name") or "this company")
    application_status = str((application or {}).get("status") or "")
    proof_focus = matched_skills[0] if matched_skills else (student_skills[0] if student_skills else "your strongest project")
    missing_focus = missing_skills[0] if missing_skills else ""

    return {
        "headline": f"{confidence} for {internship.get('title') or 'this role'}",
        "summary": (
            f"You already show {len(matched_skills)} direct overlap signal(s) for this role at {company_name}."
            + (
                f" Closing {missing_focus} is the fastest way to improve conversion."
                if missing_focus
                else " The next edge comes from stronger proof of execution and cleaner storytelling."
            )
        ),
        "fitScore": fit_score,
        "confidenceLabel": confidence,
        "matchedSkills": matched_skills[:5],
        "missingSkills": missing_skills[:4],
        "whyThisFits": [
            f"You already overlap on {_list_to_text(matched_skills[:3], 'the visible requirements')}.",
            f"{company_name} is hiring for {internship.get('title') or 'a role'} where practical execution matters more than generic claims.",
            (
                f"The main stretch area is {missing_focus}, so lead with proof of execution and a fast learning plan."
                if missing_focus
                else "There is no major visible gap, so strong proof of work is the real differentiator."
            ),
        ],
        "actionPlan": [
            {
                "title": "Lead with one proof project",
                "detail": f"Open with a project that proves {proof_focus} in a real workflow, deployment, or measurable outcome.",
            },
            {
                "title": "Frame your gap honestly",
                "detail": (
                    f"Acknowledge {missing_focus} and explain how you are closing it quickly."
                    if missing_focus
                    else "Use the interview to show depth and tradeoff thinking instead of listing more tools."
                ),
            },
            {
                "title": "Show execution speed",
                "detail": "Explain how you learn fast, ship in small iterations, and communicate blockers early.",
            },
        ],
        "evidenceChecklist": [
            f"One project or resume bullet that proves {proof_focus}.",
            "One clear outcome metric: performance, users, automation, reliability, or delivery speed.",
            (
                f"A short ramp-up plan for {missing_focus}."
                if missing_focus
                else "A concise explanation of your hardest technical decision and why you made it."
            ),
        ],
        "interviewSignals": normalize_skills(matched_skills[:2] + missing_skills[:2] + student_skills[:2])[:4],
        "applyDecision": (
            f"Already applied. Shift focus to interview prep and proof of work around {proof_focus}."
            if application_status
            else (
                f"Apply now and explicitly address {missing_focus} in your pitch."
                if fit_score >= 55 and missing_focus
                else (
                    "Apply now with a strong AI pitch and one proof project."
                    if fit_score >= 55
                    else "Strengthen one visible project first, then apply with a sharper story."
                )
            )
        ),
        "applicationStatus": application_status or None,
    }


def _build_internship_copilot(
    profile: Dict[str, Any],
    internship: Dict[str, Any],
    application: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    fallback = _fallback_internship_copilot(profile, internship, application)
    prompt = f"""
    You are an internship copilot for students.
    Return ONLY a JSON object with these keys:
    headline: string
    summary: string
    fitScore: number
    confidenceLabel: string
    matchedSkills: array of strings
    missingSkills: array of strings
    whyThisFits: array of strings
    actionPlan: array of objects with title and detail
    evidenceChecklist: array of strings
    interviewSignals: array of strings
    applyDecision: string
    applicationStatus: string or null

    Student context:
    - Skills: {json.dumps(normalize_skills(cast(List[str], profile.get("skills") or [])))}
    - Readiness: {_safe_float(profile.get("market_readiness_score"))}
    - GitHub connected: {bool(profile.get("github_username"))}
    - Resume parsed: {bool(profile.get("parsed_resume"))}
    - Verification status: {profile.get("student_verification_status") or "unknown"}

    Internship context:
    - Title: {internship.get("title") or ""}
    - Description: {internship.get("description") or ""}
    - Required skills: {json.dumps(_extract_internship_skills(internship))}

    Grounded baseline:
    {json.dumps(fallback)}

    Keep the advice concise, commercially realistic, and directly useful for applying.
    """
    result = _generate_structured_json(prompt, fallback)
    result["matchedSkills"] = normalize_skills(cast(List[str], result.get("matchedSkills") or fallback["matchedSkills"]))
    result["missingSkills"] = normalize_skills(cast(List[str], result.get("missingSkills") or fallback["missingSkills"]))
    result["interviewSignals"] = normalize_skills(cast(List[str], result.get("interviewSignals") or fallback["interviewSignals"]))
    result["fitScore"] = int(round(_safe_float(result.get("fitScore") or fallback["fitScore"])))
    if not result.get("confidenceLabel"):
        result["confidenceLabel"] = _confidence_label(int(result["fitScore"]))
    return result


def _fallback_interview_kit(student: Dict[str, Any], internship: Dict[str, Any], application: Dict[str, Any]) -> Dict[str, Any]:
    student_skills = normalize_skills(cast(List[str], student.get("skills") or []))
    required_skills = _extract_internship_skills(internship)
    student_skill_keys = {skill.lower() for skill in student_skills}
    matched_skills = [skill for skill in required_skills if skill.lower() in student_skill_keys]
    missing_skills = [skill for skill in required_skills if skill.lower() not in student_skill_keys]
    fallback_score = int(round(_safe_float(application.get("match_score")) * 100))
    fit_score = fallback_score if fallback_score > 0 else int(round(calculate_match_score(
        student_vector=cast(List[float], student.get("skill_vector") or generate_skills_embedding(student_skills)),
        internship_vector=cast(List[float], internship.get("skill_vector") or generate_skills_embedding(required_skills)),
        student_skills=student_skills,
        required_skills=required_skills,
        all_internships_skills=[_extract_internship_skills(row) for row in _fetch_internship_rows(active_only=False)],
    ) * 100))

    strengths = matched_skills[:3] or student_skills[:3]
    risks: List[str] = []
    if missing_skills:
        risks.append(f"No direct evidence of {missing_skills[0]} yet.")
    if not student.get("github_username"):
        risks.append("GitHub proof is missing, so depth must be validated through discussion.")
    if not risks:
        risks.append("Primary risk is whether the student can explain project decisions with real depth.")

    focus_areas = normalize_skills(matched_skills[:2] + missing_skills[:2])[:4]
    primary_role = internship.get("title") or "this role"
    questions = [
        {
            "question": f"Walk me through a project where you used {_list_to_text(matched_skills[:2], primary_role)}. What tradeoffs did you make?",
            "evaluateFor": "Real implementation depth and ownership",
            "signal": "Strong answers reference architecture, debugging, and measurable outcomes.",
        },
        {
            "question": f"This role depends on {_list_to_text(required_skills[:2], 'the visible stack')}. Which part are you strongest in, and why?",
            "evaluateFor": "Self-awareness and stack depth",
            "signal": "Look for precise examples rather than general claims.",
        },
        {
            "question": (
                f"{missing_skills[0]} is still a gap. How would you ramp up in your first two weeks?"
                if missing_skills
                else f"If you joined as a {primary_role}, what would your first two weeks look like?"
            ),
            "evaluateFor": "Learning velocity and execution planning",
            "signal": "Strong answers include milestones, resources, and realistic sequencing.",
        },
        {
            "question": "Describe a time requirements changed mid-build. How did you respond?",
            "evaluateFor": "Adaptability, communication, and accountability",
            "signal": "Look for prioritization and stakeholder awareness.",
        },
        {
            "question": f"What outcome would you try to create in the first 30 days of {primary_role}?",
            "evaluateFor": "Role understanding and product thinking",
            "signal": "Strong answers connect technical work to business impact.",
        },
    ]

    rubric = [
        {"area": "Technical depth", "weight": "35%", "note": f"Probe {_list_to_text(matched_skills[:2], 'the strongest visible skills')}."},
        {"area": "Learning velocity", "weight": "25%", "note": f"Test ramp-up plan for {_list_to_text(missing_skills[:2], 'new stack areas')}."},
        {"area": "Execution clarity", "weight": "20%", "note": "Look for structured thinking, not buzzwords."},
        {"area": "Communication", "weight": "20%", "note": "Check whether the student can explain tradeoffs clearly."},
    ]

    recommendation = "Move to interview" if fit_score >= 70 else "Interview only if the missing-skill gap can be coached quickly"
    return {
        "summary": f"{student.get('full_name') or 'This candidate'} is a {_confidence_label(fit_score).lower()} for {primary_role}.",
        "fitScore": fit_score,
        "strengths": strengths,
        "risks": risks[:3],
        "focusAreas": focus_areas,
        "questions": questions,
        "rubric": rubric,
        "recommendation": recommendation,
    }


def _build_interview_kit(student: Dict[str, Any], internship: Dict[str, Any], application: Dict[str, Any]) -> Dict[str, Any]:
    fallback = _fallback_interview_kit(student, internship, application)
    prompt = f"""
    You are preparing a structured interview kit for a recruiter.
    Return ONLY a JSON object with these keys:
    summary: string
    fitScore: number
    strengths: array of strings
    risks: array of strings
    focusAreas: array of strings
    questions: array of objects with question, evaluateFor, signal
    rubric: array of objects with area, weight, note
    recommendation: string

    Candidate:
    - Name: {student.get("full_name") or "Student"}
    - Skills: {json.dumps(normalize_skills(cast(List[str], student.get("skills") or [])))}
    - Resume summary: {json.dumps(str((student.get("parsed_resume") or {}).get("summary") or ""))}
    - GitHub connected: {bool(student.get("github_username"))}
    - CGPA: {_safe_float(student.get("cgpa"))}

    Internship:
    - Title: {internship.get("title") or ""}
    - Description: {internship.get("description") or ""}
    - Required skills: {json.dumps(_extract_internship_skills(internship))}

    Existing fit context:
    {json.dumps(fallback)}

    Make it practical for a real interviewer. Questions should separate depth from buzzwords.
    """
    result = _generate_structured_json(prompt, fallback)
    result["strengths"] = normalize_skills(cast(List[str], result.get("strengths") or fallback["strengths"]))
    result["risks"] = cast(List[str], result.get("risks") or fallback["risks"])
    result["focusAreas"] = normalize_skills(cast(List[str], result.get("focusAreas") or fallback["focusAreas"]))
    result["fitScore"] = int(round(_safe_float(result.get("fitScore") or fallback["fitScore"])))
    return result


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
    started_at = time.perf_counter()
    try:
        analysis = _analyze_and_store_resume(user.id, body.resumeText)
        used_fallback = not bool(os.getenv("GEMINI_API_KEY"))
        _log_ai_route(
            action_key="resume_parse",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="gemini-1.5-flash" if not used_fallback else "heuristic-resume-parser",
            used_fallback=used_fallback,
            success=True,
            request_payload={"resumeChars": len(body.resumeText or "")},
            response_payload={
                "parsedSkills": len(analysis["parsed_skills"]),
                "marketReadinessScore": analysis["market_readiness_score"],
            },
        )

        return {
            "success": True, 
            "data": analysis["parsed"],
            "skillVector": len(analysis["skill_vector"]),
            "marketReadinessScore": analysis["market_readiness_score"],
        }
    except HTTPException:
        raise
    except Exception as e:
        _log_ai_route(
            action_key="resume_parse",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="gemini-1.5-flash" if os.getenv("GEMINI_API_KEY") else "heuristic-resume-parser",
            used_fallback=not bool(os.getenv("GEMINI_API_KEY")),
            success=False,
            request_payload={"resumeChars": len(body.resumeText or "")},
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse-resume-file")
async def parse_resume_file(body: ResumeFileParseRequest, user = Depends(get_current_user)):
    started_at = time.perf_counter()
    try:
        resume_text = extract_text_from_resume_url(body.resumeUrl)
        if not resume_text.strip():
            raise HTTPException(
                status_code=400,
                detail="The uploaded resume could not be read. Please upload a clearer PDF or DOCX file.",
            )

        analysis = _analyze_and_store_resume(user.id, resume_text)
        used_fallback = not bool(os.getenv("GEMINI_API_KEY"))
        _log_ai_route(
            action_key="resume_parse_file",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="gemini-1.5-flash" if not used_fallback else "heuristic-resume-parser",
            used_fallback=used_fallback,
            success=True,
            target_type="resume",
            target_id=body.resumeUrl,
            request_payload={"resumeUrl": summarize_resume_source(body.resumeUrl)},
            response_payload={
                "parsedSkills": len(analysis["parsed_skills"]),
                "marketReadinessScore": analysis["market_readiness_score"],
            },
        )
        return {
            "success": True,
            "data": analysis["parsed"],
            "skillVector": len(analysis["skill_vector"]),
            "marketReadinessScore": analysis["market_readiness_score"],
            "source": summarize_resume_source(body.resumeUrl),
        }
    except HTTPException as exc:
        _log_ai_route(
            action_key="resume_parse_file",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="gemini-1.5-flash" if os.getenv("GEMINI_API_KEY") else "heuristic-resume-parser",
            used_fallback=not bool(os.getenv("GEMINI_API_KEY")),
            success=False,
            target_type="resume",
            target_id=body.resumeUrl,
            request_payload={"resumeUrl": summarize_resume_source(body.resumeUrl)},
            error_message=str(exc.detail),
        )
        raise
    except ValueError as exc:
        _log_ai_route(
            action_key="resume_parse_file",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="resume-text-extractor",
            used_fallback=False,
            success=False,
            target_type="resume",
            target_id=body.resumeUrl,
            request_payload={"resumeUrl": summarize_resume_source(body.resumeUrl)},
            error_message=str(exc),
        )
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as e:
        _log_ai_route(
            action_key="resume_parse_file",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="gemini-1.5-flash" if os.getenv("GEMINI_API_KEY") else "heuristic-resume-parser",
            used_fallback=not bool(os.getenv("GEMINI_API_KEY")),
            success=False,
            target_type="resume",
            target_id=body.resumeUrl,
            request_payload={"resumeUrl": summarize_resume_source(body.resumeUrl)},
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))

class GitHubVerifyRequest(pydantic.BaseModel):
    githubUsername: Optional[str] = None
    claimedSkills: List[str]

@router.post("/github-verify")
async def github_verify(body: GitHubVerifyRequest, user = Depends(get_current_user)):
    started_at = time.perf_counter()
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

        _log_ai_route(
            action_key="github_verify",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="github-evidence-v2",
            used_fallback=False,
            success=True,
            target_type="github_profile",
            target_id=str(github_username),
            request_payload={"claimedSkills": body.claimedSkills[:8]},
            response_payload={
                "verifiedSkills": len(verification["verifiedSkills"]),
                "unverifiedSkills": len(verification["unverifiedSkills"]),
                "isSuspicious": verification["isSuspicious"],
            },
        )

        return {"success": True, "data": {**verification, "marketReadinessScore": market_readiness_score}}
    except HTTPException as exc:
        _log_ai_route(
            action_key="github_verify",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="github-evidence-v2",
            used_fallback=False,
            success=False,
            request_payload={"claimedSkills": body.claimedSkills[:8]},
            error_message=str(exc.detail),
        )
        raise
    except Exception as e:
        _log_ai_route(
            action_key="github_verify",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="github-evidence-v2",
            used_fallback=False,
            success=False,
            request_payload={"claimedSkills": body.claimedSkills[:8]},
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/skill-gaps")
async def get_skill_gaps(user = Depends(get_current_user)):
    started_at = time.perf_counter()
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

        _log_ai_route(
            action_key="skill_gaps",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="market-readiness-v2",
            used_fallback=False,
            success=True,
            response_payload={
                "readinessScore": score,
                "matchCount": match_count,
                "gapCount": len(gaps_obj["missing"]),
            },
        )

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
    except HTTPException as exc:
        _log_ai_route(
            action_key="skill_gaps",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="market-readiness-v2",
            used_fallback=False,
            success=False,
            error_message=str(exc.detail),
        )
        raise
    except Exception as e:
        _log_ai_route(
            action_key="skill_gaps",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="market-readiness-v2",
            used_fallback=False,
            success=False,
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student-roadmap")
async def get_student_roadmap(user=Depends(get_current_user)):
    started_at = time.perf_counter()
    try:
        role = _get_user_role(user.id)
        if role != "student":
            raise HTTPException(status_code=403, detail="Student roadmap is only available to students")

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
        roadmap = _build_student_roadmap(profile, copilot)
        audit = _extract_ai_audit(roadmap, "student-roadmap-rules")
        _log_ai_route(
            action_key="student_roadmap",
            started_at=started_at,
            user_id=user.id,
            user_role=role,
            model_name=audit["model_name"],
            used_fallback=audit["used_fallback"],
            success=True,
            response_payload={
                "roleTargets": len(roadmap.get("roleTargets") or []),
                "prioritySkills": len(roadmap.get("prioritySkills") or []),
                "proofProjects": len(roadmap.get("proofProjects") or []),
            },
        )

        return {"success": True, "data": roadmap}
    except HTTPException as exc:
        _log_ai_route(
            action_key="student_roadmap",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="student-roadmap-rules",
            used_fallback=False,
            success=False,
            error_message=str(exc.detail),
        )
        raise
    except Exception as e:
        _log_ai_route(
            action_key="student_roadmap",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="student-roadmap-rules",
            used_fallback=False,
            success=False,
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/application-pitch")
async def generate_application_pitch(body: ApplicationPitchRequest, user=Depends(get_current_user)):
    started_at = time.perf_counter()
    try:
        role = _get_user_role(user.id)
        if role != "student":
            raise HTTPException(status_code=403, detail="Application pitch is only available to students")

        profile_response = (
            supabase.table("profiles")
            .select("id, full_name, skills, skill_vector, parsed_resume, github_username, linkedin_url, market_readiness_score, cgpa")
            .eq("id", user.id)
            .single()
            .execute()
        )
        profile = cast(Dict[str, Any], profile_response.data or {})
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")

        internship_response = (
            supabase.table("internships")
            .select("*")
            .eq("id", body.internship_id)
            .single()
            .execute()
        )
        internship = cast(Dict[str, Any], internship_response.data or {})
        if not internship:
            raise HTTPException(status_code=404, detail="Internship not found")

        pitch = _build_application_pitch(profile, internship)
        audit = _extract_ai_audit(pitch, "application-pitch-rules")
        _log_ai_route(
            action_key="application_pitch",
            started_at=started_at,
            user_id=user.id,
            user_role=role,
            model_name=audit["model_name"],
            used_fallback=audit["used_fallback"],
            success=True,
            target_type="internship",
            target_id=str(body.internship_id),
            request_payload={"internshipId": body.internship_id},
            response_payload={
                "fitScore": pitch.get("fitScore"),
                "matchedSkills": len(pitch.get("matchedSkills") or []),
                "missingSkills": len(pitch.get("missingSkills") or []),
            },
        )
        return {"success": True, "data": pitch}
    except HTTPException as exc:
        _log_ai_route(
            action_key="application_pitch",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="application-pitch-rules",
            used_fallback=False,
            success=False,
            target_type="internship",
            target_id=str(body.internship_id),
            request_payload={"internshipId": body.internship_id},
            error_message=str(exc.detail),
        )
        raise
    except Exception as e:
        _log_ai_route(
            action_key="application_pitch",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="application-pitch-rules",
            used_fallback=False,
            success=False,
            target_type="internship",
            target_id=str(body.internship_id),
            request_payload={"internshipId": body.internship_id},
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/internship-copilot/{internship_id}")
async def get_internship_copilot(internship_id: str, user=Depends(get_current_user)):
    started_at = time.perf_counter()
    try:
        role = _get_user_role(user.id)
        if role != "student":
            raise HTTPException(status_code=403, detail="Internship copilot is only available to students")

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

        internship_response = (
            supabase.table("internships")
            .select("*")
            .eq("id", internship_id)
            .single()
            .execute()
        )
        internship = cast(Dict[str, Any], internship_response.data or {})
        if not internship:
            raise HTTPException(status_code=404, detail="Internship not found")
        if not internship.get("is_active") or not internship.get("is_approved"):
            raise HTTPException(status_code=404, detail="Internship is not currently open")
        if profile.get("college_id") and internship.get("college_id") != profile.get("college_id"):
            raise HTTPException(status_code=403, detail="This internship is not available for your college")

        application_response = (
            supabase.table("applications")
            .select("id, status, match_score")
            .eq("student_id", user.id)
            .eq("internship_id", internship_id)
            .limit(1)
            .execute()
        )
        application_rows = cast(List[Dict[str, Any]], application_response.data or [])
        application = application_rows[0] if application_rows else None

        copilot = _build_internship_copilot(profile, internship, application)
        audit = _extract_ai_audit(copilot, "internship-copilot-rules")
        _log_ai_route(
            action_key="internship_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role=role,
            model_name=audit["model_name"],
            used_fallback=audit["used_fallback"],
            success=True,
            target_type="internship",
            target_id=internship_id,
            request_payload={"internshipId": internship_id},
            response_payload={
                "fitScore": copilot.get("fitScore"),
                "matchedSkills": len(copilot.get("matchedSkills") or []),
                "missingSkills": len(copilot.get("missingSkills") or []),
                "applicationStatus": copilot.get("applicationStatus"),
            },
        )
        return {"success": True, "data": copilot}
    except HTTPException as exc:
        _log_ai_route(
            action_key="internship_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="internship-copilot-rules",
            used_fallback=False,
            success=False,
            target_type="internship",
            target_id=internship_id,
            request_payload={"internshipId": internship_id},
            error_message=str(exc.detail),
        )
        raise
    except Exception as e:
        _log_ai_route(
            action_key="internship_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="internship-copilot-rules",
            used_fallback=False,
            success=False,
            target_type="internship",
            target_id=internship_id,
            request_payload={"internshipId": internship_id},
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interview-kit")
async def generate_interview_kit(body: InterviewKitRequest, user=Depends(get_current_user)):
    started_at = time.perf_counter()
    try:
        role = _get_user_role(user.id)
        if role not in {"company", "admin", "tpo"}:
            raise HTTPException(status_code=403, detail="Interview kit is only available to recruiters")

        application_response = (
            supabase.table("applications")
            .select("id, student_id, internship_id, status, match_score")
            .eq("id", body.application_id)
            .single()
            .execute()
        )
        application = cast(Dict[str, Any], application_response.data or {})
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        internship_response = (
            supabase.table("internships")
            .select("*")
            .eq("id", application.get("internship_id"))
            .single()
            .execute()
        )
        internship = cast(Dict[str, Any], internship_response.data or {})
        if not internship:
            raise HTTPException(status_code=404, detail="Internship not found")

        if role == "company" and internship.get("company_id") != user.id:
            raise HTTPException(status_code=403, detail="You can only review interview kits for your own internships")
        if role == "tpo" and internship.get("college_id") != user.id:
            raise HTTPException(status_code=403, detail="This internship is not assigned to your college")

        student_response = (
            supabase.table("profiles")
            .select("id, full_name, skills, skill_vector, parsed_resume, github_username, linkedin_url, cgpa")
            .eq("id", application.get("student_id"))
            .single()
            .execute()
        )
        student = cast(Dict[str, Any], student_response.data or {})
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")

        kit = _build_interview_kit(student, internship, application)
        audit = _extract_ai_audit(kit, "interview-kit-rules")
        _log_ai_route(
            action_key="interview_kit",
            started_at=started_at,
            user_id=user.id,
            user_role=role,
            model_name=audit["model_name"],
            used_fallback=audit["used_fallback"],
            success=True,
            target_type="application",
            target_id=str(body.application_id),
            request_payload={"applicationId": body.application_id},
            response_payload={
                "fitScore": kit.get("fitScore"),
                "questionCount": len(kit.get("questions") or []),
                "riskCount": len(kit.get("risks") or []),
            },
        )
        return {"success": True, "data": kit}
    except HTTPException as exc:
        _log_ai_route(
            action_key="interview_kit",
            started_at=started_at,
            user_id=user.id,
            user_role=role if 'role' in locals() else None,
            model_name="interview-kit-rules",
            used_fallback=False,
            success=False,
            target_type="application",
            target_id=str(body.application_id),
            request_payload={"applicationId": body.application_id},
            error_message=str(exc.detail),
        )
        raise
    except Exception as e:
        _log_ai_route(
            action_key="interview_kit",
            started_at=started_at,
            user_id=user.id,
            user_role=role if 'role' in locals() else None,
            model_name="interview-kit-rules",
            used_fallback=False,
            success=False,
            target_type="application",
            target_id=str(body.application_id),
            request_payload={"applicationId": body.application_id},
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student-copilot")
async def get_student_copilot(user=Depends(get_current_user)):
    started_at = time.perf_counter()
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
        _log_ai_route(
            action_key="student_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role=role,
            model_name="hybrid-market-copilot",
            used_fallback=False,
            success=True,
            response_payload={
                "actions": len(copilot.get("actions") or []),
                "roleFocus": len(copilot.get("roleFocus") or []),
                "topMatches": len(copilot.get("topMatches") or []),
            },
        )
        return {"success": True, "data": copilot}
    except HTTPException as exc:
        _log_ai_route(
            action_key="student_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="hybrid-market-copilot",
            used_fallback=False,
            success=False,
            error_message=str(exc.detail),
        )
        raise
    except Exception as e:
        _log_ai_route(
            action_key="student_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role="student",
            model_name="hybrid-market-copilot",
            used_fallback=False,
            success=False,
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/company-copilot")
async def get_company_copilot(user=Depends(get_current_user)):
    started_at = time.perf_counter()
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
        _log_ai_route(
            action_key="company_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role=role,
            model_name="hiring-copilot-v2",
            used_fallback=False,
            success=True,
            response_payload={
                "actions": len(copilot.get("actions") or []),
                "watchlist": len(copilot.get("watchlist") or []),
                "healthScore": copilot.get("hiringHealthScore"),
            },
        )
        return {"success": True, "data": copilot}
    except HTTPException as exc:
        _log_ai_route(
            action_key="company_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role="company",
            model_name="hiring-copilot-v2",
            used_fallback=False,
            success=False,
            error_message=str(exc.detail),
        )
        raise
    except Exception as e:
        _log_ai_route(
            action_key="company_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role="company",
            model_name="hiring-copilot-v2",
            used_fallback=False,
            success=False,
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin-copilot")
async def get_admin_copilot(user=Depends(get_current_user)):
    started_at = time.perf_counter()
    try:
        role = _get_user_role(user.id)
        if role != "admin":
            raise HTTPException(status_code=403, detail="Admin copilot is only available to admins")

        copilot = _build_admin_copilot()
        _log_ai_route(
            action_key="admin_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role=role,
            model_name="platform-ops-copilot",
            used_fallback=False,
            success=True,
            response_payload={
                "actions": len(copilot.get("actions") or []),
                "watchlist": len(copilot.get("watchlist") or []),
                "systemHealthScore": copilot.get("systemHealthScore"),
            },
        )
        return {"success": True, "data": copilot}
    except HTTPException as exc:
        _log_ai_route(
            action_key="admin_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role="admin",
            model_name="platform-ops-copilot",
            used_fallback=False,
            success=False,
            error_message=str(exc.detail),
        )
        raise
    except Exception as e:
        _log_ai_route(
            action_key="admin_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role="admin",
            model_name="platform-ops-copilot",
            used_fallback=False,
            success=False,
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tpo-copilot")
async def get_tpo_copilot(user=Depends(get_current_user)):
    started_at = time.perf_counter()
    try:
        role = _get_user_role(user.id)
        if role not in {"tpo", "college", "college_tpo"}:
            raise HTTPException(status_code=403, detail="TPO copilot is only available to college/TPO accounts")

        copilot = _build_tpo_copilot(user.id)
        _log_ai_route(
            action_key="tpo_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role=role,
            model_name="placement-ops-copilot",
            used_fallback=False,
            success=True,
            response_payload={
                "actions": len(copilot.get("actions") or []),
                "riskSkills": len(copilot.get("riskSkills") or []),
                "placementReadiness": copilot.get("placementReadiness"),
            },
        )
        return {"success": True, "data": copilot}
    except HTTPException as exc:
        _log_ai_route(
            action_key="tpo_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role="tpo",
            model_name="placement-ops-copilot",
            used_fallback=False,
            success=False,
            error_message=str(exc.detail),
        )
        raise
    except Exception as e:
        _log_ai_route(
            action_key="tpo_copilot",
            started_at=started_at,
            user_id=user.id,
            user_role="tpo",
            model_name="placement-ops-copilot",
            used_fallback=False,
            success=False,
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics")
async def get_ai_runtime_analytics(user=Depends(get_current_user)):
    role = _get_user_role(user.id)
    if role != "admin":
        raise HTTPException(status_code=403, detail="AI analytics are only available to admins")
    return {"success": True, "data": build_ai_analytics()}


@router.post("/suggest-skills")
async def suggest_skills(req: SuggestSkillsRequest, user = Depends(get_current_user)):
    started_at = time.perf_counter()
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        fallback_skills = extract_skills_from_text(f"{req.title}\n{req.description}", limit=10)
        if not api_key:
            _log_ai_route(
                action_key="suggest_skills",
                started_at=started_at,
                user_id=user.id,
                user_role=_get_user_role(user.id),
                model_name="rules-fallback",
                used_fallback=True,
                success=True,
                request_payload={"title": req.title, "descriptionChars": len(req.description or "")},
                response_payload={"skills": len(fallback_skills)},
            )
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
            _log_ai_route(
                action_key="suggest_skills",
                started_at=started_at,
                user_id=user.id,
                user_role=_get_user_role(user.id),
                model_name="rules-fallback",
                used_fallback=True,
                success=True,
                request_payload={"title": req.title, "descriptionChars": len(req.description or "")},
                response_payload={"skills": len(fallback_skills)},
            )
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
        _log_ai_route(
            action_key="suggest_skills",
            started_at=started_at,
            user_id=user.id,
            user_role=_get_user_role(user.id),
            model_name="gemini-1.5-flash" if skills != fallback_skills else "rules-fallback",
            used_fallback=skills == fallback_skills,
            success=True,
            request_payload={"title": req.title, "descriptionChars": len(req.description or "")},
            response_payload={"skills": len(skills)},
        )
        return {"success": True, "skills": skills}
    except Exception as e:
        fallback_skills = extract_skills_from_text(f"{req.title}\n{req.description}", limit=10)
        _log_ai_route(
            action_key="suggest_skills",
            started_at=started_at,
            user_id=user.id,
            user_role=_get_user_role(user.id),
            model_name="rules-fallback",
            used_fallback=True,
            success=False,
            request_payload={"title": req.title, "descriptionChars": len(req.description or "")},
            response_payload={"skills": len(fallback_skills)},
            error_message=str(e),
        )
        return {"success": True, "skills": fallback_skills, "error": str(e)}

@router.get("/recommend-candidates/{internship_id}")
async def recommend_candidates(internship_id: str, user = Depends(get_current_user)):
    started_at = time.perf_counter()
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
        _log_ai_route(
            action_key="recommend_candidates",
            started_at=started_at,
            user_id=user.id,
            user_role=role,
            model_name="candidate-ranker-v2",
            used_fallback=False,
            success=True,
            target_type="internship",
            target_id=internship_id,
            request_payload={"internshipId": internship_id},
            response_payload={"recommendations": len(top_recommendations)},
        )

        return {"success": True, "data": top_recommendations}
    except HTTPException as exc:
        _log_ai_route(
            action_key="recommend_candidates",
            started_at=started_at,
            user_id=user.id,
            user_role=role if 'role' in locals() else None,
            model_name="candidate-ranker-v2",
            used_fallback=False,
            success=False,
            target_type="internship",
            target_id=internship_id,
            request_payload={"internshipId": internship_id},
            error_message=str(exc.detail),
        )
        raise
    except Exception as e:
        _log_ai_route(
            action_key="recommend_candidates",
            started_at=started_at,
            user_id=user.id,
            user_role=role if 'role' in locals() else None,
            model_name="candidate-ranker-v2",
            used_fallback=False,
            success=False,
            target_type="internship",
            target_id=internship_id,
            request_payload={"internshipId": internship_id},
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))
