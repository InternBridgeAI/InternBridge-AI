# pyre-ignore-all-errors
from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException  # type: ignore
from pydantic import BaseModel  # type: ignore

from core.dependencies import get_current_user  # type: ignore
from core.supabase_provider import supabase  # type: ignore
from api.routers.admin import _get_role  # type: ignore

router = APIRouter()

class FeedbackCreate(BaseModel):
    application_id: str
    rating: int
    feedback_text: Optional[str] = None
    performance_metrics: Optional[Dict] = None

@router.get("/feedback/student")
async def get_student_feedback(user=Depends(get_current_user)):
    try:
        role = _get_role(user.id)
        if role != "student":
            raise HTTPException(status_code=403, detail="Only students can view their feedback")
            
        # Get all feedback for applications belonging to this student
        response = supabase.table("internship_feedback").select("*, applications!inner(student_id), profiles!mentor_id(full_name, company_name)").eq("applications.student_id", user.id).execute()
        
        return {"success": True, "data": response.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback")
async def create_feedback(data: FeedbackCreate, user=Depends(get_current_user)):
    try:
        role = _get_role(user.id)
        if role not in ["company", "admin"]:
            raise HTTPException(status_code=403, detail="Only mentors/companies can submit feedback")
            
        if data.rating < 1 or data.rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
            
        response = supabase.table("internship_feedback").insert({
            "application_id": data.application_id,
            "mentor_id": user.id,
            "rating": data.rating,
            "feedback_text": data.feedback_text,
            "performance_metrics": data.performance_metrics or {}
        }).execute()
        
        # Also log this activity
        supabase.table("activity_logs").insert({
            "user_id": user.id,
            "action": "mentor_feedback_submitted",
            "details": {"application_id": data.application_id, "rating": data.rating}
        }).execute()
        
        return {"success": True, "data": response.data[0] if response.data else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
