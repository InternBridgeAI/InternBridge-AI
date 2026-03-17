import logging
import os
import re
from typing import List, Optional

from supabase import create_client
from gotrue._sync.storage import SyncMemoryStorage
from supabase._sync.client import SupabaseException, SyncClient
from supabase.lib.client_options import ClientOptions

from .config import settings

logger = logging.getLogger(__name__)

_supabase: Optional[SyncClient] = None


class _PatchedSyncClient(SyncClient):
    """
    supabase-py<=2.5 validates keys as JWT only, which rejects modern
    Supabase `sb_publishable_*` / `sb_secret_*` keys. This patched client
    keeps the same initialization flow without that strict regex check.
    """

    def __init__(self, supabase_url: str, supabase_key: str, options=None):
        if not supabase_url:
            raise SupabaseException("supabase_url is required")
        if not supabase_key:
            raise SupabaseException("supabase_key is required")
        if not re.match(r"^(https?)://.+", supabase_url):
            raise SupabaseException("Invalid URL")

        if options is None:
            options = ClientOptions(storage=SyncMemoryStorage())

        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.options = options
        options.headers.update(self._get_auth_headers())
        self.rest_url = f"{supabase_url}/rest/v1"
        self.realtime_url = f"{supabase_url}/realtime/v1".replace("http", "ws")
        self.auth_url = f"{supabase_url}/auth/v1"
        self.storage_url = f"{supabase_url}/storage/v1"
        self.functions_url = f"{supabase_url}/functions/v1"

        self.auth = self._init_supabase_auth_client(
            auth_url=self.auth_url,
            client_options=options,
        )
        self.realtime = None
        self._postgrest = None
        self._storage = None
        self._functions = None
        self.auth.on_auth_state_change(self._listen_to_auth_events)


def _candidate_keys() -> List[str]:
    seen = set()
    keys = []
    for key in [
        settings.SUPABASE_KEY,
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", ""),
        os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""),
        os.getenv("SUPABASE_JWT_KEY", ""),
    ]:
        if key and key not in seen:
            seen.add(key)
            keys.append(key)
    return keys


def _init_supabase_client() -> Optional[SyncClient]:
    url = settings.SUPABASE_URL
    keys = _candidate_keys()
    if not keys:
        logger.error("No Supabase keys available for backend initialization.")
        return None

    for key in keys:
        try:
            return create_client(url, key)
        except Exception as exc:
            message = str(exc)
            if "Invalid API key" not in message:
                logger.warning("Supabase create_client failed: %s", message)
                continue

            # Retry with patched client for modern sb_* key formats.
            try:
                return _PatchedSyncClient(url, key)
            except Exception as patched_exc:
                logger.warning("Patched Supabase init failed: %s", patched_exc)

    logger.error("Failed to initialize Supabase client with available keys.")
    return None


def get_supabase() -> Optional[SyncClient]:
    global _supabase
    if _supabase is None:
        _supabase = _init_supabase_client()
    return _supabase


class SupabaseProxy:
    def __getattr__(self, name):
        client = get_supabase()
        if client is None:
            raise RuntimeError(
                "Supabase client is not initialized. Please check your API keys."
            )
        return getattr(client, name)


supabase = SupabaseProxy()
