-- ============================================================
-- Migration: Interconnect Student, College, and Company Roles
-- ============================================================

-- 1. Add college_id to link Students/Company Admins to their parent College (TPO)
DO $$ BEGIN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. Update RLS for profiles to allow TPOs to see their own students
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

-- Explicitly allow TPOs to select students where college_id matches their ID
-- (Since SELECT is already TRUE for everyone, this is more for backend logic clarity, 
-- but we can add more restrictive update policies)

CREATE OR REPLACE FUNCTION is_tpo_of_student(student_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = student_id AND college_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update college_reports to ensure strict ownership (already has tpo_id check)

-- 4. Enable TPOs to see applications from their students
DROP POLICY IF EXISTS "TPOs see their students' applications" ON applications;
CREATE POLICY "TPOs see their students' applications" ON applications FOR SELECT USING (
  student_id IN (SELECT id FROM profiles WHERE college_id = auth.uid())
);
