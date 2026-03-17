-- ============================================================
-- Migration v3: Align profiles schema with app expectations
-- Safe to run multiple times.
-- ============================================================

-- 1) Core profile fields used by onboarding + dashboards
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;

-- 2) Student fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cgpa DECIMAL(4,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github_username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parsed_resume JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skill_vector FLOAT8[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS market_readiness_score DECIMAL(5,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expected_graduation INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_roles TEXT[] DEFAULT '{}';

-- 3) Company fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_description TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_document_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 4) Misc fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5) Ensure college_id relationship exists (TPO linkage)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 6) Indexes used by the app (safe if already present)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_skills ON profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified) WHERE role = 'company';

-- 7) Reload PostgREST schema cache so new columns are visible to the API
SELECT pg_notify('pgrst', 'reload schema');
