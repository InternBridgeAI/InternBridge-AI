-- Migration v4: Add verification + extended profile fields

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_selected BOOLEAN DEFAULT FALSE;

-- Student verification fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_id_url TEXT;

-- College / TPO verification fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_official_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_verification_url TEXT;

-- Company verification + profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_industry TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hr_contact TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_linkedin_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_document_url TEXT;

-- Backfill role selection for existing profiles
UPDATE profiles SET role_selected = TRUE WHERE role IS NOT NULL;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');
