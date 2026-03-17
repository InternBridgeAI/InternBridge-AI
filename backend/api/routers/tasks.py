from fastapi import APIRouter, Depends, HTTPException
from core.supabase_provider import supabase
from core.dependencies import get_current_user
from pydantic import BaseModel
from typing import Dict, List, Optional

router = APIRouter()

class MicroTaskCreate(BaseModel):
    title: str
    description: str
    skills_tested: List[str] = []
    deadline: Optional[str] = None

@router.get("")
async def get_tasks():
    try:
        response = (
            supabase.table("micro_tasks")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        tasks = response.data or []

        company_ids = sorted({row.get("company_id") for row in tasks if row.get("company_id")})
        company_map: Dict[str, Dict] = {}
        if company_ids:
            company_response = (
                supabase.table("profiles")
                .select("id, company_name, company_logo_url")
                .in_("id", company_ids)
                .execute()
            )
            company_map = {row["id"]: row for row in (company_response.data or [])}

        for task in tasks:
            task["company"] = company_map.get(task.get("company_id"))

        return {"success": True, "data": tasks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_task(
    body: MicroTaskCreate,
    user = Depends(get_current_user)
):
    try:
        insert_data = body.model_dump()
        insert_data["company_id"] = user.id
        
        response = supabase.table("micro_tasks").insert(insert_data).execute()
        return {"success": True, "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
