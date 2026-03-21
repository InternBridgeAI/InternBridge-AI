# pyre-ignore-all-errors
import hashlib
import uuid
import time
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

@router.post("")
async def issue_certificate(data: CertificateCreate, user=Depends(get_current_user)):
    try:
        role = _get_role(user.id)
        if role not in ["company", "admin"]:
            raise HTTPException(status_code=403, detail="Only companies or admin can issue certificates")
        
        # In a real app, this hash would be recorded on a blockchain (e.g., Polygon/Ethereum).
        # We simulate this by hashing the certificate details and a timestamp.
        raw_string = f"{data.student_id}:{data.internship_id}:{data.title}:{user.id}:{time.time()}"
        blockchain_hash = "0x" + hashlib.sha256(raw_string.encode('utf-8')).hexdigest()
        
        # We can also generate a dummy URL representation
        cert_id = str(uuid.uuid4())
        cert_url = f"https://internbridge.ai/certificates/verify/{cert_id}"
        
        insert_data = {
            "id": cert_id,
            "student_id": data.student_id,
            "internship_id": data.internship_id,
            "issuer_id": user.id,
            "title": data.title,
            "description": data.description,
            "certificate_hash": blockchain_hash,
            "certificate_url": cert_url
        }

        response = supabase.table("certificates").insert(insert_data).execute()
        
        supabase.table("activity_logs").insert({
            "user_id": user.id,
            "action": "certificate_issued",
            "details": {"student_id": data.student_id, "certificate_id": cert_id, "tx_hash": blockchain_hash}
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
            .select("*, profiles!student_id(full_name), internships(title), profiles!issuer_id(company_name)")
            .eq("id", certificate_id)
            .single()
            .execute()
        )
        cert = response.data
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")
            
        # Simulate blockchain verification
        is_authentic = cert.get("certificate_hash", "").startswith("0x")
        
        return {
            "success": True, 
            "is_authentic": is_authentic,
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
            .select("*, profiles!issuer_id(company_name, company_logo_url)")
            .eq("student_id", user.id)
            .order("issued_at", desc=True)
            .execute()
        )
        return {"success": True, "data": response.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
