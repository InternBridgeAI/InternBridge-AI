-- Migration v10: AI action audit logging

CREATE TABLE IF NOT EXISTS public.ai_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_role TEXT,
  action_key TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model_name TEXT NOT NULL,
  used_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  target_type TEXT,
  target_id TEXT,
  request_payload JSONB NOT NULL DEFAULT '{}',
  response_payload JSONB NOT NULL DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_action_logs_created
  ON public.ai_action_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_action_logs_action_key
  ON public.ai_action_logs(action_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_action_logs_prompt_version
  ON public.ai_action_logs(prompt_version, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_action_logs_user_id
  ON public.ai_action_logs(user_id, created_at DESC);

ALTER TABLE public.ai_action_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_action_logs'
      AND policyname = 'Users see own AI logs'
  ) THEN
    CREATE POLICY "Users see own AI logs"
      ON public.ai_action_logs
      FOR SELECT
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_action_logs'
      AND policyname = 'System inserts AI logs'
  ) THEN
    CREATE POLICY "System inserts AI logs"
      ON public.ai_action_logs
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;
