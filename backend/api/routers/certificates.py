# pyre-ignore-all-errors
import hashlib
import hmac
import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore

from core.dependencies import get_current_user  # type: ignore
from core.notifications import create_notification  # type: ignore
from core.supabase_provider import supabase  # type: ignore
from api.routers.admin import _get_role  # type: ignore

router = APIRouter()

class CertificateCreate(BaseModel):
    student_id: str
    internship_id: Optional[str] = None
    title: str
    description: Optional[str] = None


def _certificate_fingerprint(
    certificate_id: str,
    student_id: str,
    internship_id: Optional[str],
    issuer_id: str,
    title: str,
    description: Optional[str],
) -> str:
    payload = "|".join(
        [
            certificate_id,
            student_id,
            internship_id or "",
            issuer_id,
            title.strip(),
            (description or "").strip(),
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _verification_base_url() -> str:
    return (
        os.getenv("NEXT_PUBLIC_SITE_URL")
        or os.getenv("NEXT_PUBLIC_APP_URL")
        or "https://internbridgeai.vercel.app"
    ).rstrip("/")

@router.post("")
async def issue_certificate(data: CertificateCreate, user=Depends(get_current_user)):
    try:
        role = _get_role(user.id)
        if role not in ["company", "admin"]:
            raise HTTPException(status_code=403, detail="Only companies or admin can issue certificates")

        cert_id = str(uuid.uuid4())
        certificate_hash = _certificate_fingerprint(
            cert_id,
            data.student_id,
            data.internship_id,
            user.id,
            data.title,
            data.description,
        )
        cert_url = f"{_verification_base_url()}/certificates/verify/{cert_id}"

        insert_data = {
            "id": cert_id,
            "student_id": data.student_id,
            "internship_id": data.internship_id,
            "issuer_id": user.id,
            "title": data.title,
            "description": data.description,
            "certificate_hash": certificate_hash,
            "certificate_url": cert_url
        }

        response = supabase.table("certificates").insert(insert_data).execute()
        
        supabase.table("activity_logs").insert({
            "user_id": user.id,
            "action": "certificate_issued",
            "details": {"student_id": data.student_id, "certificate_id": cert_id, "certificate_hash": certificate_hash}
        }).execute()

        create_notification(
            data.student_id,
            actor_id=user.id,
            notification_type="certificate_issued",
            title="Certificate issued",
            message=f"You received a new certificate: {data.title}.",
            link="/student/applications",
            metadata={"certificate_id": cert_id, "internship_id": data.internship_id},
        )
        
        return {"success": True, "data": response.data[0] if response.data else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verify/{certificate_id}")
async def verify_certificate(certificate_id: str):
    try:
        response = (
            supabase.table("certificates")
            .select("*, student:profiles!student_id(full_name), internship:internships(title), issuer:profiles!issuer_id(company_name, full_name)")
            .eq("id", certificate_id)
            .single()
            .execute()
        )
        cert = response.data
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")

        expected_hash = _certificate_fingerprint(
            cert.get("id") or "",
            cert.get("student_id") or "",
            cert.get("internship_id"),
            cert.get("issuer_id") or "",
            cert.get("title") or "",
            cert.get("description"),
        )
        is_authentic = hmac.compare_digest(cert.get("certificate_hash") or "", expected_hash)

        return {
            "success": True, 
            "is_authentic": is_authentic,
            "verification_method": "digital_fingerprint",
            "data": cert
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/student")
async def get_student_certificates(user=Depends(get_current_user)):
    try:
        response = (
            supabase.table("certificates")
            .select("*, issuer:profiles!issuer_id(company_name, company_logo_url, full_name)")
            .eq("student_id", user.id)
            .order("issued_at", desc=True)
            .execute()
        )
        return {"success": True, "data": response.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
