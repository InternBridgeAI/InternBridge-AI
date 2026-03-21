# pyre-ignore-all-errors
from typing import Optional, List, Dict, Any, Literal
from fastapi import APIRouter, Depends, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore
from datetime import datetime, timezone

from core.dependencies import get_current_user  # type: ignore
from core.notifications import create_notification  # type: ignore
from core.supabase_provider import supabase  # type: ignore
from api.routers.admin import _get_role  # type: ignore

router = APIRouter()

def _require_tpo(user_id: str) -> None:
    role = _get_role(user_id)
    if (role or "").lower() not in {"tpo", "college", "college_tpo"}:
        raise HTTPException(status_code=403, detail="TPO access required")

class OBEMappingCreate(BaseModel):
    internship_id: str
    obe_outcome_code: str
    description: Optional[str] = None
    attainment_level: float


class StudentVerificationAction(BaseModel):
    action: Literal["verify", "reject"]
    notes: Optional[str] = None


class CompanyRequestAction(BaseModel):
    action: Literal["approve", "reject"]
    notes: Optional[str] = None


def _attach_company_profiles(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    company_ids: List[str] = sorted(
        {str(row.get("company_id")) for row in rows if row.get("company_id")}
    )
    if not company_ids:
        return rows

    company_rows = (
        supabase.table("profiles")
        .select("id, company_name, full_name, email, company_website, company_industry, hr_contact, company_document_url")
        .in_("id", company_ids)
        .execute()
    )
    company_map = {row["id"]: row for row in (company_rows.data or [])}
    for row in rows:
        row["company"] = company_map.get(row.get("company_id"))
    return rows


@router.get("/approvals")
async def get_tpo_approvals(user=Depends(get_current_user)):
    """
    One-stop queue for College/TPO approvals:
    - Student verification (pending students from your college)
    - Company partnership requests
    - Internship approvals (internships targeting your college)
    """
    try:
        _require_tpo(user.id)

        students_response = (
            supabase.table("profiles")
            .select("id, full_name, email, college_email, student_id_url, created_at, student_verification_status")
            .eq("role", "student")
            .eq("college_id", user.id)
            .eq("student_verification_status", "pending")
            .order("created_at", desc=True)
            .execute()
        )

        company_requests_response = (
            supabase.table("college_company_requests")
            .select("id, college_id, company_id, status, notes, requested_at")
            .eq("college_id", user.id)
            .eq("status", "pending")
            .order("requested_at", desc=True)
            .execute()
        )
        company_requests = company_requests_response.data or []
        company_requests = _attach_company_profiles(company_requests)

        internships_response = (
            supabase.table("internships")
            .select("*")
            .eq("college_id", user.id)
            .eq("is_approved", False)
            .order("created_at", desc=True)
            .execute()
        )
        internships = internships_response.data or []
        internships = _attach_company_profiles(internships)

        return {
            "success": True,
            "data": {
                "students": students_response.data or [],
                "companies": company_requests,
                "internships": internships,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/students/{student_id}/verify")
async def verify_student(
    student_id: str,
    body: StudentVerificationAction,
    user=Depends(get_current_user),
):
    try:
        _require_tpo(user.id)

        student_response = (
            supabase.table("profiles")
            .select("id, role, college_id")
            .eq("id", student_id)
            .single()
            .execute()
        )
        student_row = student_response.data or {}
        if not student_row:
            raise HTTPException(status_code=404, detail="Student not found")
        if (student_row.get("role") or "").lower() != "student":
            raise HTTPException(status_code=400, detail="Target user is not a student")
        if student_row.get("college_id") != user.id:
            raise HTTPException(status_code=403, detail="Student does not belong to your college")

        new_status = "verified" if body.action == "verify" else "rejected"
        update_payload: Dict[str, Any] = {
            "student_verification_status": new_status,
            "student_verified_by": user.id,
            "student_verified_at": datetime.now(timezone.utc).isoformat(),
            "student_verification_notes": body.notes,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        updated = (
            supabase.table("profiles")
            .update(update_payload)
            .eq("id", student_id)
            .execute()
        )

        supabase.table("activity_logs").insert(
            {
                "user_id": user.id,
                "action": "student_verified" if body.action == "verify" else "student_rejected",
                "details": {"student_id": student_id, "notes": body.notes},
            }
        ).execute()

        create_notification(
            student_id,
            actor_id=user.id,
            notification_type="student_verified" if body.action == "verify" else "student_rejected",
            title="Profile verified" if body.action == "verify" else "Profile rejected",
            message=(
                "Your college has verified your student profile. You can now apply to internships."
                if body.action == "verify"
                else "Your college rejected your student verification. Please review your documents and profile."
            ),
            link="/student/profile" if body.action != "verify" else "/student/internships",
            metadata={"notes": body.notes},
        )

        return {"success": True, "data": updated.data[0] if updated.data else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/company-requests/{request_id}")
async def decide_company_request(
    request_id: str,
    body: CompanyRequestAction,
    user=Depends(get_current_user),
):
    try:
        _require_tpo(user.id)

        req_response = (
            supabase.table("college_company_requests")
            .select("id, college_id, company_id, status")
            .eq("id", request_id)
            .single()
            .execute()
        )
        req_row = req_response.data or {}
        if not req_row:
            raise HTTPException(status_code=404, detail="Request not found")
        if req_row.get("college_id") != user.id:
            raise HTTPException(status_code=403, detail="Request does not belong to your college")

        new_status = "approved" if body.action == "approve" else "rejected"
        update_payload: Dict[str, Any] = {
            "status": new_status,
            "notes": body.notes,
            "decided_at": datetime.now(timezone.utc).isoformat(),
            "decided_by": user.id,
        }
        updated = (
            supabase.table("college_company_requests")
            .update(update_payload)
            .eq("id", request_id)
            .execute()
        )

        supabase.table("activity_logs").insert(
            {
                "user_id": user.id,
                "action": "company_request_approved" if body.action == "approve" else "company_request_rejected",
                "details": {
                    "request_id": request_id,
                    "company_id": req_row.get("company_id"),
                    "notes": body.notes,
                },
            }
        ).execute()

        create_notification(
            req_row.get("company_id"),
            actor_id=user.id,
            notification_type="company_request_approved" if body.action == "approve" else "company_request_rejected",
            title="College partnership approved" if body.action == "approve" else "College partnership rejected",
            message=(
                "Your partnership request has been approved. You can now post internships for this college."
                if body.action == "approve"
                else "Your partnership request was rejected by the college."
            ),
            link="/company/internships/new",
            metadata={"request_id": request_id, "notes": body.notes},
        )

        return {"success": True, "data": updated.data[0] if updated.data else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/master")
async def get_master_report(user=Depends(get_current_user)):
    try:
        _require_tpo(user.id)
        # In a real system, we'd filter by students from the TPO's college.
        # Here we just fetch all accepted applications for simplicity.
        response = (
            supabase.table("applications")
            .select("id, status, student_id, internship_id, created_at, profiles!inner(full_name, email, college_name, college_id), internships!inner(title, stipend, company_id, type)")
            .eq("status", "accepted")
            .eq("profiles.college_id", user.id)
            .execute()
        )
        
        applications = response.data or []
        
        # Aggregate company info
        company_ids = list(set([app["internships"]["company_id"] for app in applications if app.get("internships")]))
        companies = {}
        if company_ids:
            comp_response = supabase.table("profiles").select("id, company_name").in_("id", company_ids).execute()
            companies = {c["id"]: c["company_name"] for c in comp_response.data}
            
        formatted_data = []
        total_stipend = 0
        count_paid = 0
        
        for app in applications:
            student = app.get("profiles", {})
            internship = app.get("internships", {})
            comp_id = internship.get("company_id")
            stipend = internship.get("stipend") or 0
            
            if stipend > 0:
                total_stipend += stipend
                count_paid += 1
                
            formatted_data.append({
                "application_id": app["id"],
                "student_id": app.get("student_id"),
                "student_name": student.get("full_name"),
                "student_email": student.get("email"),
                "college": student.get("college_name"),
                "company_name": companies.get(comp_id, "Unknown"),
                "role": internship.get("title"),
                "type": internship.get("type"),
                "stipend": stipend,
                "placed_date": app["created_at"]
            })
            
        avg_stipend = total_stipend / count_paid if count_paid > 0 else 0
        
        # Save a report snapshot
        supabase.table("college_reports").insert({
            "tpo_id": user.id,
            "report_type": "Batch Report",
            "data": {
                "total_placements": len(formatted_data),
                "avg_stipend": avg_stipend
            }
        }).execute()

        return {
            "success": True, 
            "data": formatted_data,
            "summary": {
                "total_placements": len(formatted_data),
                "avg_stipend": avg_stipend
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/skill-gap")
async def get_skill_gap_report(user=Depends(get_current_user)):
    try:
        _require_tpo(user.id)
        # Fetch all skill gaps
        response = supabase.table("skill_gaps").select("missing_skills").execute()
        gaps = response.data or []
        
        skill_counts = {}
        total_students_with_gaps = len(gaps)
        
        for gap in gaps:
            for skill in gap.get("missing_skills", []):
                skill_counts[skill] = skill_counts.get(skill, 0) + 1
                
        # Calculate percentage gap based on total students who had any gap recorded
        # Or simple frequency for now
        gap_analysis: List[Dict[str, Any]] = []
        for skill, count in skill_counts.items():
            raw_percentage = (count / max(1, total_students_with_gaps)) * 100
            percentage = float(f"{raw_percentage:.1f}")
            gap_analysis.append({
                "skill": skill,
                "count": count,
                "gap_percentage": percentage
            })
            
        gap_analysis.sort(key=lambda x: int(x["count"]), reverse=True)
        
        top_gaps = [g for i, g in enumerate(gap_analysis) if i < 5]
        
        supabase.table("college_reports").insert({
            "tpo_id": user.id,
            "report_type": "Skill Gap Report",
            "data": {"top_gaps": top_gaps}
        }).execute()

        return {"success": True, "data": gap_analysis}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/obe")
async def get_obe_mappings(user=Depends(get_current_user)):
    try:
        _require_tpo(user.id)
        response = supabase.table("obe_mappings").select("*, internships(title, company_id)").execute()
        return {"success": True, "data": response.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/obe")
async def create_obe_mapping(data: OBEMappingCreate, user=Depends(get_current_user)):
    try:
        _require_tpo(user.id)
        response = supabase.table("obe_mappings").insert({
            "internship_id": data.internship_id,
            "obe_outcome_code": data.obe_outcome_code,
            "description": data.description,
            "attainment_level": data.attainment_level
        }).execute()
        
        return {"success": True, "data": response.data[0] if response.data else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
