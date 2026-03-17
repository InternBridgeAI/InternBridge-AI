from typing import Optional


from fastapi import APIRouter, Depends, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore

from core.dependencies import get_current_user  # type: ignore
from core.supabase_provider import supabase  # type: ignore
from core.security import detect_fake_posting, verify_company_document  # type: ignore

router = APIRouter()


class VerifyRequest(BaseModel):
    profile_id: str
    action: str
    notes: Optional[str] = None


def _get_role(user_id: str) -> str:
    profile_response = (
        supabase.table("profiles").select("role").eq("id", user_id).single().execute()
    )
    role = (profile_response.data or {}).get("role")
    if not role:
        raise HTTPException(status_code=403, detail="User profile not found")
    return role


def _require_admin(user_id: str) -> None:
    if _get_role(user_id) != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/users")
async def get_all_users(role: Optional[str] = None, user=Depends(get_current_user)):
    try:
        requester_role = _get_role(user.id)
        if requester_role == "tpo":
            if role != "student":
                raise HTTPException(
                    status_code=403,
                    detail="TPOs can only view student profiles",
                )
        elif requester_role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        query = supabase.table("profiles").select("*")
        if requester_role == "tpo":
            # TPOs only see their students
            query = query.eq("college_id", user.id).eq("role", "student")
        elif role:
            query = query.eq("role", role)
            
        response = query.execute()
        return {"success": True, "data": response.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# from core.security import detect_fake_posting, verify_company_document

@router.post("/verify")
async def verify_company(data: VerifyRequest, user=Depends(get_current_user)):
    try:
        _require_admin(user.id)

        is_verified = data.action == "verify"
        
        # Additional Security check if verifying
        if is_verified:
            profile = supabase.table("profiles").select("company_document_url").eq("id", data.profile_id).single().execute()
            doc_url_raw = (profile.data or {}).get("company_document_url")
            doc_url = str(doc_url_raw) if doc_url_raw else None
            if not verify_company_document(doc_url):
                 raise HTTPException(status_code=400, detail="Invalid company document format or document missing")

        response = (
            supabase.table("profiles")
            .update({"is_verified": is_verified})
            .eq("id", data.profile_id)
            .execute()
        )

        supabase.table("activity_logs").insert(
            {
                "user_id": user.id,
                "action": "company_verified" if is_verified else "company_rejected",
                "details": {
                    "profile_id": data.profile_id,
                    "notes": data.notes,
                },
            }
        ).execute()

        return {
            "success": True,
            "message": f"Company {data.action}ed successfully",
            "data": response.data[0] if response.data else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-fraud")
async def check_fraud_posting(title: str, description: str, user=Depends(get_current_user)):
    try:
        _require_admin(user.id)
        is_suspicious = detect_fake_posting(title, description)
        return {"success": True, "is_suspicious": is_suspicious}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs")
async def get_activity_logs(limit: int = 50, user=Depends(get_current_user)):
    try:
        _require_admin(user.id)
        safe_limit = max(1, min(limit, 200))
        response = (
            supabase.table("activity_logs")
            .select("*")
            .order("created_at", desc=True)
            .limit(safe_limit)
            .execute()
        )
        logs = response.data or []
        user_ids = sorted({row.get("user_id") for row in logs if row.get("user_id")})
        user_map = {}
        if user_ids:
            users_response = (
                supabase.table("profiles")
                .select("id, full_name, role, email")
                .in_("id", user_ids)
                .execute()
            )
            user_map = {row["id"]: row for row in (users_response.data or [])}

        for row in logs:
            row["user"] = user_map.get(row.get("user_id"))

        return {"success": True, "data": logs}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
