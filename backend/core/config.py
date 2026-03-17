import os
from pathlib import Path

from dotenv import load_dotenv

# Resolve .env.local from repo root regardless of current working directory.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=PROJECT_ROOT / ".env.local")


class Settings:
    SUPABASE_URL: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    # Prefer the service role key; fall back to publishable/anon keys for dev.
    SUPABASE_KEY: str = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    )

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError(
            "Supabase environment variables are missing. "
            "Expected NEXT_PUBLIC_SUPABASE_URL and a Supabase key in .env.local."
        )


settings = Settings()
