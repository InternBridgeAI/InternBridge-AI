-- Migration v9: Ensure internship skill columns exist for AI matching

ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skill_vector FLOAT8[];

CREATE INDEX IF NOT EXISTS idx_internships_skills
  ON public.internships USING GIN(required_skills);
