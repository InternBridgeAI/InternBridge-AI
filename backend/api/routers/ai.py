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
