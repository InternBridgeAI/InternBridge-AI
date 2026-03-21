from typing import Any, Dict, Iterable, Optional

from core.supabase_provider import supabase  # type: ignore


def create_notification(
    recipient_id: Optional[str],
    *,
    title: str,
    message: str,
    notification_type: str = "general",
    actor_id: Optional[str] = None,
    link: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    if not recipient_id:
        return

    payload: Dict[str, Any] = {
        "recipient_id": recipient_id,
        "actor_id": actor_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "link": link,
        "metadata": metadata or {},
    }
    try:
        supabase.table("notifications").insert(payload).execute()
    except Exception as exc:
        print(f"Notification insert failed: {exc}")


def create_notifications(
    recipient_ids: Iterable[Optional[str]],
    *,
    title: str,
    message: str,
    notification_type: str = "general",
    actor_id: Optional[str] = None,
    link: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    seen = set()
    for recipient_id in recipient_ids:
        if not recipient_id or recipient_id in seen:
            continue
        seen.add(recipient_id)
        create_notification(
            recipient_id,
            title=title,
            message=message,
            notification_type=notification_type,
            actor_id=actor_id,
            link=link,
            metadata=metadata,
        )
