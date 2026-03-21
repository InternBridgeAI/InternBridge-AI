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

def _get_user_role(user_id: str) -> str:
    profile_response = (
        supabase.table("profiles").select("role").eq("id", user_id).single().execute()
    )
    role = (profile_response.data or {}).get("role")
    if not role:
        raise HTTPException(status_code=403, detail="User profile not found")
    return role


@router.get("")
async def get_tasks(user=Depends(get_current_user)):
    try:
        role = _get_user_role(user.id)
        query = supabase.table("micro_tasks").select("*").order("created_at", desc=True)

        if role == "company":
            query = query.eq("company_id", user.id)

        response = query.execute()
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_task(
    body: MicroTaskCreate,
    user = Depends(get_current_user)
):
    try:
        role = _get_user_role(user.id)
        if role not in {"company", "admin"}:
            raise HTTPException(status_code=403, detail="Only companies or admins can create tasks")

        insert_data = body.model_dump()
        insert_data["company_id"] = user.id
        
        response = supabase.table("micro_tasks").insert(insert_data).execute()
        return {"success": True, "data": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{task_id}")
async def delete_task(task_id: str, user=Depends(get_current_user)):
    try:
        role = _get_user_role(user.id)

        task_response = (
            supabase.table("micro_tasks")
            .select("id, company_id")
            .eq("id", task_id)
            .single()
            .execute()
        )
        task = task_response.data or {}
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        if role != "admin" and task.get("company_id") != user.id:
            raise HTTPException(status_code=403, detail="You cannot delete this task")

        response = supabase.table("micro_tasks").delete().eq("id", task_id).execute()
        return {"success": True, "data": response.data[0] if response.data else None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
