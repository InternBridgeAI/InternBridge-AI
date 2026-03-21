-- Migration v6: College verification flows (students + company partnerships + college-targeted internships)
-- Safe to run multiple times.

-- ============================================================
-- 1) Student verification fields (approved by College/TPO)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_verification_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS student_verified_by UUID,
  ADD COLUMN IF NOT EXISTS student_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS student_verification_notes TEXT;

-- Backfill (in case the column already existed with NULLs)
UPDATE public.profiles
SET student_verification_status = 'pending'
WHERE student_verification_status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_student_verification_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_student_verification_status_check
      CHECK (student_verification_status IN ('pending', 'verified', 'rejected'));
  END IF;
END $$;

-- ============================================================
-- 2) College-targeted internships (posted to a specific college)
-- ============================================================
ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_internships_college_id ON public.internships(college_id);

-- ============================================================
-- 3) Company partnership requests (College/TPO verifies companies)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.college_company_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(college_id, company_id)
);

ALTER TABLE public.college_company_requests ENABLE ROW LEVEL SECURITY;

-- Companies can create requests for themselves
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'college_company_requests'
      AND policyname = 'Companies create own partnership requests'
  ) THEN
    CREATE POLICY "Companies create own partnership requests" ON public.college_company_requests
      FOR INSERT WITH CHECK (company_id = auth.uid());
  END IF;
END $$;

-- Companies and the target college can view the request
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'college_company_requests'
      AND policyname = 'Companies/Colleges view partnership requests'
  ) THEN
    CREATE POLICY "Companies/Colleges view partnership requests" ON public.college_company_requests
      FOR SELECT USING (company_id = auth.uid() OR college_id = auth.uid());
  END IF;
END $$;

-- Colleges/TPO can decide requests targeting them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'college_company_requests'
      AND policyname = 'Colleges decide partnership requests'
  ) THEN
    CREATE POLICY "Colleges decide partnership requests" ON public.college_company_requests
      FOR UPDATE USING (college_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'college_company_requests_status_check'
  ) THEN
    ALTER TABLE public.college_company_requests
      ADD CONSTRAINT college_company_requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ccr_college_status ON public.college_company_requests(college_id, status);
CREATE INDEX IF NOT EXISTS idx_ccr_company ON public.college_company_requests(company_id);

-- Reload PostgREST schema cache so new columns are visible to the API
SELECT pg_notify('pgrst', 'reload schema');
