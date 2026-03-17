import base64
import json
import re
from typing import Optional
from urllib.parse import unquote

from fastapi import Header, HTTPException, Request

from core.supabase_provider import supabase

_AUTH_COOKIE_PATTERN = re.compile(r"^sb-[^-]+-auth-token(?:\.\d+)?$")


def _jwt_like(value: str) -> bool:
    return value.count(".") >= 2 and " " not in value and "\n" not in value


def _extract_token_from_json_blob(blob: str) -> Optional[str]:
    if not blob:
        return None
    if _jwt_like(blob):
        return blob

    try:
        parsed = json.loads(blob)
    except Exception:
        return None

    if isinstance(parsed, dict):
        token = parsed.get("access_token")
        if isinstance(token, str) and token:
            return token
        current_session = parsed.get("currentSession") or {}
        nested_token = current_session.get("access_token")
        if isinstance(nested_token, str) and nested_token:
            return nested_token

    if isinstance(parsed, list):
        for item in parsed:
            if isinstance(item, str) and _jwt_like(item):
                return item
            if isinstance(item, dict):
                token = item.get("access_token")
                if isinstance(token, str) and token:
                    return token

    return None


def _extract_token_from_cookies(request: Request) -> Optional[str]:
    # Common simple cookie names.
    for key in ("sb-access-token", "supabase-access-token", "access_token"):
        value = request.cookies.get(key)
        if value and _jwt_like(value):
            return value

    # Supabase SSR cookie naming scheme: sb-<project>-auth-token(.0/.1...)
    matched = [name for name in request.cookies.keys() if _AUTH_COOKIE_PATTERN.match(name)]
    if not matched:
        return None

    def sort_key(name: str) -> int:
        if "." in name and name.rsplit(".", 1)[1].isdigit():
            return int(name.rsplit(".", 1)[1])
        return -1

    raw = "".join(request.cookies[name] for name in sorted(matched, key=sort_key))
    decoded = unquote(raw)

    token = _extract_token_from_json_blob(decoded)
    if token:
        return token

    # Some helpers encode cookie as base64-prefixed JSON.
    if decoded.startswith("base64-"):
        payload = decoded.removeprefix("base64-")
        padded = payload + "=" * ((4 - len(payload) % 4) % 4)
        try:
            decoded_base64 = base64.b64decode(padded).decode("utf-8")
        except Exception:
            return None
        return _extract_token_from_json_blob(decoded_base64)

    return None


def _extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    return token or None


async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(default=None),
):
    bearer_token = _extract_bearer_token(authorization)
    cookie_token = _extract_token_from_cookies(request)

    tokens_to_try = []
    if bearer_token:
        tokens_to_try.append(bearer_token)
    if cookie_token and cookie_token != bearer_token:
        tokens_to_try.append(cookie_token)

    if not tokens_to_try:
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    for token in tokens_to_try:
        try:
            user_response = supabase.auth.get_user(token)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except Exception:
            continue

        if user_response and user_response.user:
            return user_response.user

    raise HTTPException(status_code=401, detail="Invalid session")
