-- Migration v5: College courses + student course selection

-- Student course fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS course_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS year_of_study INTEGER;

-- College courses catalog (owned by a college/TPO profile)
CREATE TABLE IF NOT EXISTS public.college_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_years INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(college_id, name)
);

ALTER TABLE public.college_courses ENABLE ROW LEVEL SECURITY;

-- Students should be able to read courses for dropdowns
CREATE POLICY IF NOT EXISTS "Courses are viewable" ON public.college_courses
  FOR SELECT USING (true);

-- Colleges/TPO manage their own courses
CREATE POLICY IF NOT EXISTS "Colleges manage own courses" ON public.college_courses
  FOR ALL USING (college_id = auth.uid()) WITH CHECK (college_id = auth.uid());

-- Updated-at helper (reuse existing function if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_college_courses_updated_at'
  ) THEN
    CREATE TRIGGER set_college_courses_updated_at
    BEFORE UPDATE ON public.college_courses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

