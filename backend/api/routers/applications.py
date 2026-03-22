# pyre-ignore-all-errors
from typing import Any, Dict, List, Literal, Optional, cast

from fastapi import APIRouter, Depends, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore

from core.ai_utils import calculate_match_score, extract_skills_from_text, normalize_skills  # type: ignore
from core.dependencies import get_current_user  # type: ignore
from core.notifications import create_notification  # type: ignore
from core.supabase_provider import supabase  # type: ignore

router = APIRouter()

ApplicationStatus = Literal[
    "pending", "shortlisted", "interview", "accepted", "rejected", "withdrawn"
]


class ApplicationCreate(BaseModel):
    internship_id: str
    cover_letter: Optional[str] = None


class ApplicationUpdate(BaseModel):
    application_id: str
    status: ApplicationStatus
    interview_details: Optional[Dict] = None


def _get_user_role(user_id: str) -> str:
    profile_response = (
        supabase.table("profiles").select("role").eq("id", user_id).single().execute()
    )
    role = (profile_response.data or {}).get("role")
    if not role:
        raise HTTPException(status_code=403, detail="User profile not found")
    return role


def _application_status_copy(
    status: ApplicationStatus,
    internship_title: str,
    interview_details: Optional[Dict[str, Any]] = None,
) -> Dict[str, str]:
    if status == "shortlisted":
        return {
            "title": "You have been shortlisted",
            "message": f"Your application for {internship_title} has been shortlisted.",
        }
    if status == "interview":
        when = ""
        if interview_details:
            date = interview_details.get("date")
            time = interview_details.get("time")
            if date and time:
                when = f" on {date} at {time}"
        return {
            "title": "Interview scheduled",
            "message": f"Your interview for {internship_title} is scheduled{when}.",
        }
    if status == "accepted":
        return {
            "title": "Application accepted",
            "message": f"Congratulations. You have been selected for {internship_title}.",
        }
    if status == "rejected":
        return {
            "title": "Application update",
            "message": f"Your application for {internship_title} was not selected this time.",
        }
    if status == "withdrawn":
        return {
            "title": "Application withdrawn",
            "message": f"The student withdrew their application for {internship_title}.",
        }
    return {
        "title": "Application updated",
        "message": f"Your application for {internship_title} is now {status}.",
    }


def _extract_required_skills(internship_row: Dict[str, Any]) -> List[str]:
    explicit = internship_row.get("required_skills")
    if isinstance(explicit, list) and explicit:
        return normalize_skills(cast(List[str], explicit))

    fallback_text = "\n".join(
        [
            str(internship_row.get("title") or ""),
            str(internship_row.get("description") or ""),
        ]
    ).strip()
    return extract_skills_from_text(fallback_text)


def _attach_relations(
    applications: List[Dict],
    include_student: bool,
    include_internship: bool,
) -> List[Dict]:
    if include_student:
        student_ids: List[str] = sorted(
            {str(row.get("student_id")) for row in applications if row.get("student_id")}
        )
        student_map: Dict[str, Dict] = {}
        if student_ids:
            students_response = (
                supabase.table("profiles")
                .select("id, full_name, email, skills, cgpa, github_username, avatar_url")
                .in_("id", student_ids)
                .execute()
            )
            student_map = {row["id"]: row for row in (students_response.data or [])}

        for application in applications:
            student_id_val = application.get("student_id")
            if student_id_val is not None:
                application["student"] = student_map.get(str(student_id_val))

    if include_internship:
        internship_ids: List[str] = sorted(
            {str(row.get("internship_id")) for row in applications if row.get("internship_id")}
        )
        internship_map: Dict[str, Dict] = {}
        if internship_ids:
            internships_response = (
                supabase.table("internships")
                .select("id, title, company_id, type, is_paid, stipend")
                .in_("id", internship_ids)
                .execute()
            )
            internship_map = {row["id"]: row for row in (internships_response.data or [])}

            company_ids: List[str] = sorted(
                {
                    str(row.get("company_id"))
                    for row in internship_map.values()
                    if row.get("company_id")
                }
            )
            company_map: Dict[str, Dict] = {}
            if company_ids:
                companies_response = (
                    supabase.table("profiles")
                    .select("id, company_name, full_name")
                    .in_("id", company_ids)
                    .execute()
                )
                company_map = {
                    row["id"]: {
                        "company_name": row.get("company_name") or row.get("full_name"),
                    }
                    for row in (companies_response.data or [])
                }

            for internship in internship_map.values():
                company = company_map.get(str(internship.get("company_id")))
                if company:
                    internship["company"] = company
                    internship["profiles"] = company

        for application in applications:
            internship_id_val = application.get("internship_id")
            if internship_id_val is not None:
                application["internship"] = internship_map.get(str(internship_id_val))

    return applications


@router.get("")
async def get_applications(
    internship_id: Optional[str] = None,
    user=Depends(get_current_user),
):
    try:
        role = _get_user_role(user.id)

        if internship_id:
            if role not in {"company", "admin"}:
                raise HTTPException(
                    status_code=403,
                    detail="Only companies/admin can view applicant lists",
                )

            if role == "company":
                internship_check = (
                    supabase.table("internships")
                    .select("id")
                    .eq("id", internship_id)
                    .eq("company_id", user.id)
                    .single()
                    .execute()
                )
                if not internship_check.data:
                    raise HTTPException(
                        status_code=403,
                        detail="You do not have access to this internship applicants",
                    )

            response = (
                supabase.table("applications")
                .select("*")
                .eq("internship_id", internship_id)
                .order("created_at", desc=True)
                .execute()
            )
            applications = _attach_relations(response.data or [], include_student=True, include_internship=True)
            return {"success": True, "data": applications}

        if role == "company":
            internships_response = (
                supabase.table("internships").select("id").eq("company_id", user.id).execute()
            )
            internship_ids = [row["id"] for row in (internships_response.data or [])]
            if not internship_ids:
                return {"success": True, "data": []}

            response = (
                supabase.table("applications")
                .select("*")
                .in_("internship_id", internship_ids)
                .order("created_at", desc=True)
                .execute()
            )
            applications = _attach_relations(response.data or [], include_student=True, include_internship=True)
        else:
            # Student viewing own applications.
            response = (
                supabase.table("applications")
                .select("*")
                .eq("student_id", user.id)
                .order("created_at", desc=True)
                .execute()
            )
            applications = _attach_relations(response.data or [], include_student=False, include_internship=True)

        return {"success": True, "data": applications}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def apply_to_internship(
    body: ApplicationCreate,
    user=Depends(get_current_user),
):
    try:
        role = _get_user_role(user.id)
        if role != "student":
            raise HTTPException(status_code=403, detail="Only students can apply")

        student_profile_response = (
            supabase.table("profiles")
            .select("college_id, student_verification_status")
            .eq("id", user.id)
            .single()
            .execute()
        )
        student_profile = student_profile_response.data or {}
        if not student_profile.get("college_id"):
            raise HTTPException(
                status_code=400,
                detail="Please select your college during onboarding before applying.",
            )
        if student_profile.get("student_verification_status") != "verified":
            raise HTTPException(
                status_code=403,
                detail="Your college has not verified your student profile yet.",
            )

        existing_response = (
            supabase.table("applications")
            .select("id")
            .eq("student_id", user.id)
            .eq("internship_id", body.internship_id)
            .limit(1)
            .execute()
        )
        if existing_response.data:
            raise HTTPException(status_code=409, detail="Already applied to this internship")

        internship_response = (
            supabase.table("internships")
            .select("*")
            .eq("id", body.internship_id)
            .single()
            .execute()
        )
        internship_data = internship_response.data or {}
        if not internship_data:
            raise HTTPException(status_code=404, detail="Internship not found")
        if not internship_data.get("is_active", True) or not internship_data.get(
            "is_approved", True
        ):
            raise HTTPException(
                status_code=400, detail="This internship is not accepting applications"
            )
        if internship_data.get("college_id") != student_profile.get("college_id"):
            raise HTTPException(
                status_code=403,
                detail="This internship is not available for your college.",
            )

        profile_response = (
            supabase.table("profiles")
            .select("skill_vector, skills")
            .eq("id", user.id)
            .single()
            .execute()
        )
        all_internships_response = supabase.table("internships").select("*").execute()
        all_internships_skills = [
            _extract_required_skills(cast(Dict[str, Any], row))
            for row in (all_internships_response.data or [])
        ]

        match_score = 0.0
        if profile_response.data and internship_data:
            profile_data = profile_response.data or {}
            student_vec = profile_data.get("skill_vector")
            internship_vec = internship_data.get("skill_vector")
            student_skills = profile_data.get("skills") or []
            if isinstance(student_vec, list) and isinstance(internship_vec, list):
                match_score = calculate_match_score(
                    student_vector=cast(List[float], student_vec),
                    internship_vector=cast(List[float], internship_vec),
                    student_skills=cast(List[str], student_skills),
                    required_skills=_extract_required_skills(cast(Dict[str, Any], internship_data)),
                    all_internships_skills=cast(List[List[str]], all_internships_skills),
                )

        insert_data = {
            "student_id": user.id,
            "internship_id": body.internship_id,
            "cover_letter": body.cover_letter,
            "match_score": float(f"{match_score:.4f}"),
        }
        response = supabase.table("applications").insert(insert_data).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to submit application")

        supabase.table("activity_logs").insert(
            {
                "user_id": user.id,
                "action": "application_submitted",
                "details": {
                    "internship_id": body.internship_id,
                    "match_score": match_score,
                },
            }
        ).execute()

        student_name_response = (
            supabase.table("profiles").select("full_name").eq("id", user.id).single().execute()
        )
        student_name = (student_name_response.data or {}).get("full_name") or "A student"
        internship_title = str(internship_data.get("title") or "the internship")
        internship_id = str(body.internship_id)

        create_notification(
            user.id,
            actor_id=user.id,
            notification_type="application_submitted",
            title="Application submitted",
            message=f"Your application for {internship_title} has been submitted successfully.",
            link="/student/applications",
            metadata={"internship_id": internship_id},
        )
        create_notification(
            internship_data.get("company_id"),
            actor_id=user.id,
            notification_type="application_received",
            title="New application received",
            message=f"{student_name} applied for {internship_title}.",
            link=f"/company/candidates?internship_id={internship_id}",
            metadata={"internship_id": internship_id, "student_id": user.id},
        )

        return {"success": True, "data": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("")
async def update_application_status(
    body: ApplicationUpdate,
    user=Depends(get_current_user),
):
    try:
        role = _get_user_role(user.id)

        application_response = (
            supabase.table("applications")
            .select("id, student_id, internship_id, status")
            .eq("id", body.application_id)
            .single()
            .execute()
        )
        application = application_response.data
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        if role == "student":
            if application["student_id"] != user.id:
                raise HTTPException(status_code=403, detail="Cannot modify this application")
            if body.status != "withdrawn":
                raise HTTPException(
                    status_code=403,
                    detail="Students can only withdraw their own applications",
                )
        elif role == "company":
            internship_response = (
                supabase.table("internships")
                .select("id")
                .eq("id", application["internship_id"])
                .eq("company_id", user.id)
                .single()
                .execute()
            )
            if not internship_response.data:
                raise HTTPException(
                    status_code=403,
                    detail="Cannot update applications outside your internships",
                )
        elif role != "admin":
            raise HTTPException(status_code=403, detail="Not allowed")

        update_data: Dict[str, Any] = {"status": body.status}
        
        # Auto-generate Jitsi Meet link for interviews
        if body.status == "interview":
            interview_details = body.interview_details or {}
            if "meet_link" not in interview_details:
                interview_details["meet_link"] = f"https://meet.jit.si/InternBridge-{body.application_id}"
            update_data["interview_details"] = interview_details
        elif body.interview_details:
            update_data["interview_details"] = body.interview_details

        response = (
            supabase.table("applications")
            .update(update_data)
            .eq("id", body.application_id)
            .execute()
        )

        internship_response = (
            supabase.table("internships")
            .select("id, title, company_id")
            .eq("id", application["internship_id"])
            .single()
            .execute()
        )
        internship_row = internship_response.data or {}
        internship_title = str(internship_row.get("title") or "the internship")

        if body.status != application.get("status"):
            copy = _application_status_copy(
                body.status,
                internship_title,
                cast(Optional[Dict[str, Any]], update_data.get("interview_details")),
            )
            if body.status == "withdrawn":
                student_response = (
                    supabase.table("profiles")
                    .select("full_name")
                    .eq("id", application["student_id"])
                    .single()
                    .execute()
                )
                student_name = (student_response.data or {}).get("full_name") or "A student"
                create_notification(
                    internship_row.get("company_id"),
                    actor_id=user.id,
                    notification_type="application_withdrawn",
                    title=copy["title"],
                    message=f"{student_name} withdrew their application for {internship_title}.",
                    link=f"/company/candidates?internship_id={application['internship_id']}",
                    metadata={"application_id": body.application_id, "internship_id": application["internship_id"]},
                )
            else:
                create_notification(
                    application["student_id"],
                    actor_id=user.id,
                    notification_type=f"application_{body.status}",
                    title=copy["title"],
                    message=copy["message"],
                    link="/student/applications",
                    metadata={"application_id": body.application_id, "internship_id": application["internship_id"]},
                )

        return {"success": True, "data": response.data[0] if response.data else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
