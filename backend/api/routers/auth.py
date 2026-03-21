from fastapi import APIRouter, Depends, HTTPException, Body  # type: ignore
from core.supabase_provider import supabase  # type: ignore
from core.dependencies import get_current_user  # type: ignore
from pydantic import BaseModel  # type: ignore
from typing import List, Optional
from datetime import datetime

router = APIRouter()

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    github_username: Optional[str] = None
    linkedin_url: Optional[str] = None
    cgpa: Optional[str] = None
    skills: Optional[List[str]] = None
    avatar_url: Optional[str] = None
    resume_url: Optional[str] = None
    is_onboarded: Optional[bool] = None
    location: Optional[str] = None
    university: Optional[str] = None
    expected_graduation: Optional[int] = None
    gender: Optional[str] = None
    preferred_roles: Optional[List[str]] = None
    college_id: Optional[str] = None
    college_name: Optional[str] = None
    college_email: Optional[str] = None
    student_verification_status: Optional[str] = None
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    year_of_study: Optional[int] = None
    student_id_url: Optional[str] = None
    college_official_email: Optional[str] = None
    college_website: Optional[str] = None
    college_verification_url: Optional[str] = None
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    company_industry: Optional[str] = None
    company_size: Optional[str] = None
    hr_contact: Optional[str] = None
    company_linkedin_url: Optional[str] = None
    gst_number: Optional[str] = None
    company_document_url: Optional[str] = None
    role: Optional[str] = None
    role_selected: Optional[bool] = None

class OTPRequest(BaseModel):
    email: str

class OTPVerify(BaseModel):
    email: str
    token: str
    type: str = "magiclink"

@router.post("/send-otp")
async def send_otp(data: OTPRequest):
    try:
        # Supabase Python client for OTP
        supabase.auth.sign_in_with_otp({"email": data.email})
        return {"success": True, "message": "OTP/Magic Link sent to email"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-otp")
async def verify_otp(data: OTPVerify):
    try:
        response = supabase.auth.verify_otp({
            "email": data.email,
            "token": data.token,
            "type": data.type
        })
        return {"success": True, "data": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile")
async def get_profile(user = Depends(get_current_user)):
    try:
        response = supabase.table("profiles").select("*").eq("id", user.id).single().execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/profile")
async def update_profile(
    body: ProfileUpdate, 
    user = Depends(get_current_user)
):
    try:
        update_data = body.model_dump(exclude_none=True)
        update_data["updated_at"] = datetime.now().isoformat()
        
        update_data["id"] = user.id
        response = supabase.table("profiles").upsert(update_data).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
