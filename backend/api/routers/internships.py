from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.ai_utils import generate_skills_embedding
from core.dependencies import get_current_user
from core.supabase_provider import supabase

router = APIRouter()


class InternshipCreate(BaseModel):
    title: str
    description: str
    required_skills: List[str]
    college_id: Optional[str] = None
    type: Optional[str] = "remote"
    is_paid: Optional[bool] = False
    stipend: Optional[float] = None
    duration_weeks: Optional[int] = 4
    location: Optional[str] = None
    max_applicants: Optional[int] = 50
    deadline: Optional[str] = None


class InternshipApproval(BaseModel):
    is_approved: bool


def _get_user_role(user_id: str) -> str:
    profile_response = (
        supabase.table("profiles").select("role").eq("id", user_id).single().execute()
    )
    role = (profile_response.data or {}).get("role")
    if not role:
        raise HTTPException(status_code=403, detail="User profile not found")
    return role


def _attach_company_profiles(internships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    company_ids: List[str] = sorted(
        {str(item.get("company_id")) for item in internships if item.get("company_id")}
    )
    if not company_ids:
        return internships

    company_rows = (
        supabase.table("profiles")
        .select("id, full_name, company_name, company_logo_url")
        .in_("id", company_ids)
        .execute()
    )
    company_map = {
        row["id"]: {
            "full_name": row.get("full_name"),
            "company_name": row.get("company_name"),
            "company_logo_url": row.get("company_logo_url"),
        }
        for row in (company_rows.data or [])
    }
    for internship in internships:
        internship["company"] = company_map.get(internship.get("company_id"))

    return internships


@router.get("")
async def get_internships(
    status: Optional[str] = None,
    company_id: Optional[str] = None,
    my_internships: Optional[str] = None,
    user=Depends(get_current_user),
):
    try:
        role = _get_user_role(user.id)

        query = supabase.table("internships").select("*").order("created_at", desc=True)

        # Company scoping
        if my_internships == "true":
            query = query.eq("company_id", user.id)
        if company_id:
            query = query.eq("company_id", company_id)

        # College scoping
        if role == "student":
            profile_response = (
                supabase.table("profiles")
                .select("college_id")
                .eq("id", user.id)
                .single()
                .execute()
            )
            student_college_id = (profile_response.data or {}).get("college_id")
            if not student_college_id:
                return {"success": True, "data": []}
            query = query.eq("college_id", student_college_id)
        elif role == "tpo":
            query = query.eq("college_id", user.id)

        # Status filters
        if status == "active":
            query = query.eq("is_active", True).eq("is_approved", True)
        elif status == "pending":
            query = query.eq("is_approved", False)

        response = query.execute()
        internships = response.data or []

        internships = _attach_company_profiles(internships)

        # Provide applicant counts used by company/admin dashboards.
        internship_ids = [item.get("id") for item in internships if item.get("id")]
        if internship_ids:
            applications_response = (
                supabase.table("applications")
                .select("internship_id")
                .in_("internship_id", internship_ids)
                .execute()
            )
            counts: Dict[str, int] = {}
            for row in applications_response.data or []:
                internship_ref = row.get("internship_id")
                if internship_ref:
                    counts[internship_ref] = counts.get(internship_ref, 0) + 1

            for internship in internships:
                internship["applicant_count"] = counts.get(internship.get("id", ""), 0)

        return {"success": True, "data": internships}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{internship_id}")
async def get_internship_by_id(
    internship_id: str,
    user=Depends(get_current_user),
):
    try:
        response = (
            supabase.table("internships")
            .select("*")
            .eq("id", internship_id)
            .single()
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Internship not found")

        internship = _attach_company_profiles([response.data])[0]
        return {"success": True, "data": internship}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_internship(
    body: InternshipCreate,
    user=Depends(get_current_user),
):
    try:
        role = _get_user_role(user.id)
        if role not in {"company", "admin"}:
            raise HTTPException(
                status_code=403, detail="Only companies can create internships"
            )

        if not body.college_id:
            raise HTTPException(status_code=400, detail="Please select a target college")

        # Validate college exists.
        college_response = (
            supabase.table("profiles")
            .select("id, role, full_name, college_name")
            .eq("id", body.college_id)
            .single()
            .execute()
        )
        college_row = college_response.data or {}
        if not college_row:
            raise HTTPException(status_code=400, detail="Selected college not found")
        if (college_row.get("role") or "").lower() not in {"tpo", "college", "college_tpo"}:
            raise HTTPException(status_code=400, detail="Selected profile is not a college/TPO")

        if role == "company":
            # Company must be approved by the selected college before posting.
            request_response = (
                supabase.table("college_company_requests")
                .select("status")
                .eq("college_id", body.college_id)
                .eq("company_id", user.id)
                .limit(1)
                .execute()
            )
            request_row = (request_response.data or [None])[0]
            if not request_row or request_row.get("status") != "approved":
                raise HTTPException(
                    status_code=403,
                    detail="Your company is not approved by this college yet. Request approval first.",
                )

        # Generate skill vector for the internship.
        skill_vector = generate_skills_embedding(body.required_skills)

        insert_data = body.model_dump()
        insert_data["company_id"] = user.id
        insert_data["skill_vector"] = skill_vector
        insert_data["required_skills"] = body.required_skills
        if not insert_data.get("is_paid"):
            insert_data["stipend"] = None

        response = supabase.table("internships").insert(insert_data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create internship")

        created = response.data[0]
        supabase.table("activity_logs").insert(
            {
                "user_id": user.id,
                "action": "internship_created",
                "details": {"internship_id": created["id"], "title": body.title},
            }
        ).execute()

        return {"success": True, "data": created}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{internship_id}/approve")
async def approve_internship(
    internship_id: str,
    body: InternshipApproval,
    user=Depends(get_current_user),
):
    try:
        role = _get_user_role(user.id)
        if role not in {"admin", "tpo"}:
            raise HTTPException(
                status_code=403, detail="Only admins/TPOs can approve internships"
            )

        existing = (
            supabase.table("internships")
            .select("id, title, college_id")
            .eq("id", internship_id)
            .single()
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Internship not found")

        if role == "tpo" and existing.data.get("college_id") != user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only approve internships targeting your college",
            )

        update_payload: Dict[str, Any] = {
            "is_approved": body.is_approved,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if body.is_approved:
            update_payload["is_active"] = True
            update_payload["approved_by"] = user.id
            update_payload["approved_at"] = datetime.now(timezone.utc).isoformat()
            update_payload["rejection_reason"] = None
        else:
            update_payload["is_active"] = False
            update_payload["approved_by"] = user.id
            update_payload["approved_at"] = datetime.now(timezone.utc).isoformat()

        response = (
            supabase.table("internships")
            .update(update_payload)
            .eq("id", internship_id)
            .execute()
        )

        supabase.table("activity_logs").insert(
            {
                "user_id": user.id,
                "action": "internship_approved"
                if body.is_approved
                else "internship_rejected",
                "details": {
                    "internship_id": internship_id,
                    "title": existing.data.get("title"),
                },
            }
        ).execute()

        return {"success": True, "data": response.data[0] if response.data else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
