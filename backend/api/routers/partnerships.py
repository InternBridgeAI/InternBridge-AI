from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore

from core.dependencies import get_current_user  # type: ignore
from core.notifications import create_notification  # type: ignore
from core.supabase_provider import supabase  # type: ignore
from api.routers.admin import _get_role  # type: ignore

router = APIRouter()


class PartnershipRequest(BaseModel):
    college_id: str


def _require_company(user_id: str) -> None:
    if _get_role(user_id) != "company":
        raise HTTPException(status_code=403, detail="Company access required")


@router.get("/status")
async def get_partnership_status(college_id: str, user=Depends(get_current_user)):
    try:
        _require_company(user.id)
        response = (
            supabase.table("college_company_requests")
            .select("id, status, notes, requested_at, decided_at, decided_by")
            .eq("college_id", college_id)
            .eq("company_id", user.id)
            .limit(1)
            .execute()
        )
        row = (response.data or [None])[0]
        return {"success": True, "data": row}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my")
async def get_my_partnership_requests(user=Depends(get_current_user)):
    try:
        _require_company(user.id)
        response = (
            supabase.table("college_company_requests")
            .select("*")
            .eq("company_id", user.id)
            .order("requested_at", desc=True)
            .execute()
        )
        return {"success": True, "data": response.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/request")
async def request_partnership(body: PartnershipRequest, user=Depends(get_current_user)):
    try:
        _require_company(user.id)

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

        existing_response = (
            supabase.table("college_company_requests")
            .select("id, status")
            .eq("college_id", body.college_id)
            .eq("company_id", user.id)
            .limit(1)
            .execute()
        )
        existing = (existing_response.data or [None])[0]
        if existing:
            if existing.get("status") == "rejected":
                refreshed = (
                    supabase.table("college_company_requests")
                    .update(
                        {
                            "status": "pending",
                            "notes": None,
                            "requested_at": datetime.now(timezone.utc).isoformat(),
                            "decided_at": None,
                            "decided_by": None,
                        }
                    )
                    .eq("id", existing.get("id"))
                    .execute()
                )
                row = refreshed.data[0] if refreshed.data else existing
                create_notification(
                    body.college_id,
                    actor_id=user.id,
                    notification_type="company_request_pending",
                    title="Partnership request resubmitted",
                    message="A company has resubmitted a partnership request for your review.",
                    link="/tpo/approvals",
                    metadata={"request_id": row.get("id"), "company_id": user.id},
                )
                create_notification(
                    user.id,
                    actor_id=user.id,
                    notification_type="company_request_pending",
                    title="Partnership request resubmitted",
                    message="Your college partnership request was resubmitted successfully.",
                    link="/company/internships/new",
                    metadata={"request_id": row.get("id"), "college_id": body.college_id},
                )
                return {"success": True, "data": row, "message": "Request resubmitted"}

            return {"success": True, "data": existing, "message": "Request already exists"}

        payload: Dict[str, Any] = {
            "college_id": body.college_id,
            "company_id": user.id,
            "status": "pending",
            "requested_at": datetime.now(timezone.utc).isoformat(),
        }
        inserted = supabase.table("college_company_requests").insert(payload).execute()
        row = inserted.data[0] if inserted.data else None

        supabase.table("activity_logs").insert(
            {
                "user_id": user.id,
                "action": "company_partnership_requested",
                "details": {
                    "college_id": body.college_id,
                },
            }
        ).execute()

        create_notification(
            body.college_id,
            actor_id=user.id,
            notification_type="company_request_pending",
            title="New partnership request",
            message="A company wants to partner with your college for internships.",
            link="/tpo/approvals",
            metadata={"request_id": row.get("id") if row else None, "company_id": user.id},
        )
        create_notification(
            user.id,
            actor_id=user.id,
            notification_type="company_request_pending",
            title="Request submitted",
            message="Your partnership request was sent to the college for review.",
            link="/company/internships/new",
            metadata={"request_id": row.get("id") if row else None, "college_id": body.college_id},
        )

        return {"success": True, "data": row, "message": "Request submitted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
