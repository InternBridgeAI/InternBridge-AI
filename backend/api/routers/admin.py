from typing import Any, Dict, List, Optional


from fastapi import APIRouter, Depends, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore

from core.dependencies import get_current_user  # type: ignore
from core.notifications import create_notification  # type: ignore
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

        create_notification(
            data.profile_id,
            actor_id=user.id,
            notification_type="company_verified" if is_verified else "company_rejected",
            title="Company verified" if is_verified else "Company verification rejected",
            message=(
                "Your company profile has been approved. You can now operate fully on InternBridge."
                if is_verified
                else "Your company verification was rejected. Please review your documents and details."
            ),
            link="/company",
            metadata={"notes": data.notes},
        )

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


@router.get("/fraud-signals")
async def get_fraud_signals(limit: int = 25, user=Depends(get_current_user)):
    try:
        _require_admin(user.id)
        safe_limit = max(1, min(limit, 100))

        students = (
            supabase.table("profiles")
            .select(
                "id, full_name, email, skills, parsed_resume, resume_url, github_username, "
                "linkedin_url, market_readiness_score, student_verification_status"
            )
            .eq("role", "student")
            .execute()
            .data
            or []
        )
        companies = (
            supabase.table("profiles")
            .select("id, company_name, full_name, company_document_url, is_verified")
            .eq("role", "company")
            .execute()
            .data
            or []
        )
        internships = (
            supabase.table("internships")
            .select("id, title, description, company_id, is_active, is_approved")
            .execute()
            .data
            or []
        )

        companies_by_id = {row["id"]: row for row in companies if row.get("id")}
        internship_counts: Dict[str, int] = {}
        for row in internships:
            company_id = row.get("company_id")
            if company_id:
                internship_counts[company_id] = internship_counts.get(company_id, 0) + 1

        severity_rank = {"high": 3, "medium": 2, "low": 1}
        flags: List[Dict[str, Any]] = []

        for row in students:
            skills = row.get("skills") or []
            claimed_skill_count = len(skills) if isinstance(skills, list) else 0
            has_evidence = bool(row.get("parsed_resume") or row.get("resume_url") or row.get("github_username"))
            readiness = float(row.get("market_readiness_score") or 0)

            if row.get("student_verification_status") == "rejected":
                flags.append(
                    {
                        "id": f"student-rejected-{row.get('id')}",
                        "severity": "high",
                        "type": "verification_rejected",
                        "subject": row.get("full_name") or row.get("email") or "Student profile",
                        "reason": "Student verification was rejected and still needs manual review or correction.",
                        "confidence": 0.94,
                        "href": "/admin/users",
                    }
                )
            elif claimed_skill_count >= 10 and not has_evidence:
                flags.append(
                    {
                        "id": f"student-evidence-{row.get('id')}",
                        "severity": "medium",
                        "type": "evidence_gap",
                        "subject": row.get("full_name") or row.get("email") or "Student profile",
                        "reason": f"{claimed_skill_count} claimed skills but no resume parse or GitHub evidence attached.",
                        "confidence": 0.81,
                        "href": "/admin/users",
                    }
                )
            elif readiness >= 85 and not has_evidence:
                flags.append(
                    {
                        "id": f"student-readiness-{row.get('id')}",
                        "severity": "medium",
                        "type": "readiness_outlier",
                        "subject": row.get("full_name") or row.get("email") or "Student profile",
                        "reason": "High market-readiness score without supporting resume or GitHub signals.",
                        "confidence": 0.76,
                        "href": "/admin/fraud",
                    }
                )

        for row in companies:
            company_name = row.get("company_name") or row.get("full_name") or "Company profile"
            has_live_activity = internship_counts.get(row.get("id"), 0) > 0
            document_url = row.get("company_document_url")

            if not row.get("is_verified") and has_live_activity:
                flags.append(
                    {
                        "id": f"company-unverified-{row.get('id')}",
                        "severity": "high",
                        "type": "unverified_employer",
                        "subject": company_name,
                        "reason": "Company has internship activity before verification was completed.",
                        "confidence": 0.9,
                        "href": "/admin/companies",
                    }
                )
            if not row.get("is_verified") and not verify_company_document(document_url):
                flags.append(
                    {
                        "id": f"company-document-{row.get('id')}",
                        "severity": "medium",
                        "type": "document_gap",
                        "subject": company_name,
                        "reason": "Verification document is missing or does not use a supported secure file format.",
                        "confidence": 0.84,
                        "href": "/admin/companies",
                    }
                )

        for row in internships:
            title = str(row.get("title") or "")
            description = str(row.get("description") or "")
            if not title and not description:
                continue
            if detect_fake_posting(title, description):
                company_name = (
                    companies_by_id.get(row.get("company_id"), {}).get("company_name")
                    or "Unknown company"
                )
                flags.append(
                    {
                        "id": f"internship-risk-{row.get('id')}",
                        "severity": "high",
                        "type": "posting_risk",
                        "subject": title or "Internship posting",
                        "reason": f"Posting content for {company_name} matches known scam or low-trust language patterns.",
                        "confidence": 0.92,
                        "href": "/admin/internships",
                    }
                )

        flags.sort(
            key=lambda item: (
                -severity_rank.get(str(item.get("severity")), 0),
                -float(item.get("confidence") or 0),
            )
        )

        return {"success": True, "data": flags[:safe_limit]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
