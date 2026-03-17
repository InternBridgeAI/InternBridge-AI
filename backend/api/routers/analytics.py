import collections
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException

from core.dependencies import get_current_user
from core.supabase_provider import supabase

router = APIRouter()


def _safe_select(table: str, columns: str, **filters):
    query = supabase.table(table).select(columns)
    for key, value in filters.items():
        query = query.eq(key, value)
    return query.execute()


def _safe_count(table: str, **filters) -> int:
    try:
        response = _safe_select(table, "id", **filters)
        if response.count is not None:
            return int(response.count)
        return len(response.data or [])
    except Exception:
        return 0


@router.get("")
async def get_analytics(user=Depends(get_current_user)):
    try:
        students_count = _safe_count("profiles", role="student")
        companies_count = _safe_count("profiles", role="company")
        internships_count = _safe_count("internships")
        applications_total = _safe_count("applications")

        # Application status distribution
        try:
            status_rows = _safe_select("applications", "status").data or []
        except Exception:
            status_rows = []
        status_counts = collections.Counter(
            row.get("status", "unknown") for row in status_rows if row.get("status")
        )

        # Top skills
        try:
            profiles_rows = _safe_select("profiles", "skills", role="student").data or []
        except Exception:
            profiles_rows = []
        skill_counts = collections.Counter()
        for profile in profiles_rows:
            for skill in profile.get("skills") or []:
                skill_counts[skill] += 1
        top_skills = [{"skill": name, "count": count} for name, count in skill_counts.most_common(10)]

        # Paid/unpaid split (optional column support)
        paid = 0
        unpaid = 0
        try:
            paid_rows = _safe_select("internships", "is_paid").data or []
            paid = sum(1 for row in paid_rows if row.get("is_paid"))
            unpaid = len(paid_rows) - paid
        except Exception:
            unpaid = internships_count

        return {
            "success": True,
            "data": {
                "counts": {
                    "students": students_count,
                    "companies": companies_count,
                    "internships": internships_count,
                    "applications": applications_total,
                },
                "statusDistribution": dict(status_counts),
                "topSkills": top_skills,
                "paidVsUnpaid": {"paid": paid, "unpaid": unpaid},
                # Backward-compatible aliases used by older frontend pages.
                "total_users": students_count + companies_count,
                "total_students": students_count,
                "total_companies": companies_count,
                "total_internships": internships_count,
                "total_applications": applications_total,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
