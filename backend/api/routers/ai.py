from fastapi import APIRouter, Depends, HTTPException, File, UploadFile  # type: ignore
import os
import requests  # type: ignore
from core.supabase_provider import supabase  # type: ignore
from core.dependencies import get_current_user  # type: ignore

import pydantic  # type: ignore
from typing import List, Optional, Dict, Set, Any, cast
import json

from core.github_utils import verify_github_skills  # type: ignore
from core.gemini_utils import parse_resume_with_gemini  # type: ignore
from core.ai_utils import generate_skills_embedding, calculate_match_score  # type: ignore

class SuggestSkillsRequest(pydantic.BaseModel):
    title: str
    description: str

router = APIRouter()

class ResumeParseRequest(pydantic.BaseModel):
    resumeText: str

@router.post("/parse-resume")
async def parse_resume(body: ResumeParseRequest, user = Depends(get_current_user)):
    try:
        # Parse resume with Gemini
        parsed = parse_resume_with_gemini(body.resumeText)
        
        # Generate skill vector using Python embedding utility
        skills = parsed.get("skills")
        if not isinstance(skills, list):
            skills = []
        skill_vector = generate_skills_embedding(skills)
        
        # Update user profile in Supabase
        supabase.table("profiles").update({
            "parsed_resume": parsed,
            "skills": parsed.get("skills"),
            "skill_vector": skill_vector
        }).eq("id", user.id).execute()
        
        # Cache the skill vector
        supabase.table("skill_vectors").upsert({
            "reference_id": user.id,
            "reference_type": "student",
            "skills_text": ", ".join(parsed.get("skills", [])),
            "vector": skill_vector
        }, on_conflict="reference_id,reference_type").execute()
        
        # Log activity
        supabase.table("activity_logs").insert({
            "user_id": user.id,
            "action": "resume_parsed",
            "details": {"skills_count": len(parsed.get("skills", []))}
        }).execute()
        
        return {
            "success": True, 
            "data": parsed,
            "skillVector": len(skill_vector)
        }
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
            .select("github_username")
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
        
        return {"success": True, "data": verification}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/skill-gaps")
async def get_skill_gaps(user = Depends(get_current_user)):
    try:
        # Fetch user profile
        profile_response = (
            supabase.table("profiles").select("*").eq("id", user.id).single().execute()
        )
        profile = profile_response.data
        
        user_skills = cast(List[str], (profile.get("skills") or []) if profile else [])
        user_skills_set: Set[str] = {s.lower() for s in user_skills} if user_skills else set()
        
        # Fetch active internships to analyze market demand
        internships_response = supabase.table("internships").select("*").execute()
        internships = cast(List[Dict[str, Any]], internships_response.data)
        
        match_count: int = 0
        missing_map: Dict[str, int] = {}
        market_demand_map: Dict[str, int] = {}
        
        if internships:
            for internship in internships:
                has_enough_skills = True
                req_skills = cast(List[str], internship.get("required_skills") or [])
                
                for skill in req_skills:
                    skill_lower = skill.lower()
                    market_demand_map[skill] = market_demand_map.get(skill, 0) + 1
                    
                    if skill_lower not in user_skills_set:
                        has_enough_skills = False
                        missing_map[skill] = missing_map.get(skill, 0) + 1
                
                if has_enough_skills and req_skills:
                    match_count += 1
        
        # Calculate missing
        missing_items = sorted(list(missing_map.items()), key=lambda x: x[1], reverse=True)
        top_missing = []
        for i in range(min(len(missing_items), 4)):
            top_missing.append(missing_items[i])
        
        gaps_obj = {
            "missing": [m[0] for m in top_missing],
            "market_count": dict(top_missing)
        }
        
        # Calculate industry demand trends
        demand_items = sorted(list(market_demand_map.items()), key=lambda x: x[1], reverse=True)
        top_industry_base = []
        for i in range(min(len(demand_items), 4)):
            top_industry_base.append(demand_items[i])
            
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
            
        # Readiness score logic
        score = 50
        cgpa_num = float(profile.get("cgpa") or 0) if profile else 0
        if cgpa_num >= 9: score += 20
        elif cgpa_num >= 8: score += 10
        elif cgpa_num >= 7: score += 5
        
        score += min(len(user_skills) * 3, 20)
        score += min(match_count * 2, 10)
        
        if profile and profile.get("github_username"): score += 5
        if profile and profile.get("parsed_resume"): score += 5
        
        # Recommendations
        recommendations = []
        for skill_item in top_missing:
            skill = skill_item[0]
            recommendations.append({
                "title": f"Learn {skill} for Web Development",
                "provider": "Coursera / Udemy",
                "level": "Beginner to Intermediate",
                "link": "#"
            })
            
        if not recommendations:
            recommendations.append({
                "title": "Advanced System Design",
                "provider": "GitHub",
                "level": "Advanced",
                "link": "#"
            })
            
        # Get top skills explicitly to avoid slicing issues
        top_skills_list: List[str] = []
        if user_skills:
            for i in range(min(len(user_skills), 5)):
                top_skills_list.append(user_skills[i])
                
        return {
            "success": True,
            "data": {
                "readinessScore": min(score, 99),
                "matchCount": match_count,
                "topSkills": top_skills_list,
                "gaps": gaps_obj,
                "recommendations": recommendations,
                "industryDemand": top_industry
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/suggest-skills")
async def suggest_skills(req: SuggestSkillsRequest, user = Depends(get_current_user)):
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set")

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
            return {"success": True, "skills": []} # Fallback
            
        result = response.json()
        text = result["candidates"][0]["content"]["parts"][0]["text"]
        
        # Simple extraction
        import json
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        skills = json.loads(text)
        return {"success": True, "skills": skills}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/recommend-candidates/{internship_id}")
async def recommend_candidates(internship_id: str, user = Depends(get_current_user)):
    try:
        # 1. Fetch internship details
        internship_res = supabase.table("internships").select("*").eq("id", internship_id).single().execute()
        internship = internship_res.data
        if not internship:
            raise HTTPException(status_code=404, detail="Internship not found")
            
        # 2. Fetch all student profiles with skill vectors
        students_res = supabase.table("profiles").select("*").eq("role", "student").not_.is_("skill_vector", "null").execute()
        students = students_res.data or []
        
        # 3. Fetch all internships skills for TF-IDF context
        all_internships_res = supabase.table("internships").select("required_skills").execute()
        all_internships = all_internships_res.data or []
        all_internships_skills = [i.get("required_skills") or [] for i in all_internships]
        
        recommendations: List[Dict[str, Any]] = []
        for student in students:
            score = calculate_match_score(
                student_vector=student.get("skill_vector") or [],
                internship_vector=internship.get("skill_vector") or [],
                student_skills=student.get("skills") or [],
                required_skills=internship.get("required_skills") or [],
                all_internships_skills=all_internships_skills
            )
            
            if score > 0.3: # Threshold
                recommendations.append({
                    "id": student["id"],
                    "full_name": student["full_name"],
                    "email": student["email"],
                    "score": round(score * 100, 2),
                    "skills": student.get("skills") or [],
                    "avatar_url": student.get("avatar_url")
                })
        
        top_recommendations = []
        for i in range(min(20, len(recommendations))):
            top_recommendations.append(recommendations[i])
            
        return {"success": True, "data": top_recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
