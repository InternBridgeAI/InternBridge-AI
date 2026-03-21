-- ============================================================
-- InternBridge AI – Supabase Database Schema
-- Run this in the Supabase SQL Editor to create all tables
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('student', 'company', 'admin', 'tpo');
CREATE TYPE application_status AS ENUM ('pending', 'shortlisted', 'interview', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE internship_type AS ENUM ('remote', 'in-office', 'hybrid');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE task_status AS ENUM ('pending', 'passed', 'failed');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'student',
  role_selected BOOLEAN DEFAULT FALSE,
  college_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  avatar_url TEXT,
  phone TEXT,
  is_onboarded BOOLEAN DEFAULT FALSE,
  location TEXT,
  -- Student fields
  cgpa DECIMAL(4,2),
  skills TEXT[] DEFAULT '{}',
  projects JSONB DEFAULT '[]',
  github_username TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  parsed_resume JSONB,
  skill_vector FLOAT8[],
  market_readiness_score DECIMAL(5,2),
  college_name TEXT,
  university TEXT,
  expected_graduation INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
  preferred_roles TEXT[] DEFAULT '{}',
  course_id UUID,
  course_name TEXT,
  year_of_study INTEGER,
  college_email TEXT,
  student_id_url TEXT,
  student_verification_status verification_status DEFAULT 'pending',
  student_verified_by UUID REFERENCES profiles(id),
  student_verified_at TIMESTAMPTZ,
  student_verification_notes TEXT,
  -- College / TPO fields
  college_official_email TEXT,
  college_website TEXT,
  college_verification_url TEXT,
  -- Company fields
  company_name TEXT,
  company_description TEXT,
  company_website TEXT,
  company_logo_url TEXT,
  company_industry TEXT,
  company_size TEXT,
  hr_contact TEXT,
  company_linkedin_url TEXT,
  gst_number TEXT,
  company_document_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_skills ON profiles USING GIN(skills);
CREATE INDEX idx_profiles_is_verified ON profiles(is_verified) WHERE role = 'company';

-- ============================================================
-- INTERNSHIPS
-- ============================================================
CREATE TABLE internships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  college_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  skill_vector FLOAT8[],
  type internship_type DEFAULT 'remote',
  is_paid BOOLEAN DEFAULT FALSE,
  stipend DECIMAL(10,2),
  duration_weeks INTEGER DEFAULT 4,
  location TEXT,
  max_applicants INTEGER DEFAULT 50,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_internships_company ON internships(company_id);
CREATE INDEX IF NOT EXISTS idx_internships_college_id ON internships(college_id);
CREATE INDEX idx_internships_skills ON internships USING GIN(required_skills);
CREATE INDEX idx_internships_active ON internships(is_active, is_approved);

-- ============================================================
-- APPLICATIONS
-- ============================================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  internship_id UUID NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  status application_status DEFAULT 'pending',
  match_score DECIMAL(5,4),
  cover_letter TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, internship_id)
);

CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_internship ON applications(internship_id);
CREATE INDEX idx_applications_status ON applications(status);

-- ============================================================
-- SKILL VECTORS (cached embeddings)
-- ============================================================
CREATE TABLE skill_vectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_id UUID NOT NULL,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('student', 'internship')),
  skills_text TEXT NOT NULL,
  vector FLOAT8[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skill_vectors_ref ON skill_vectors(reference_id, reference_type);

-- ============================================================
-- SKILL GAPS
-- ============================================================
CREATE TABLE skill_gaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  internship_id UUID REFERENCES internships(id) ON DELETE SET NULL,
  missing_skills TEXT[] DEFAULT '{}',
  recommended_resources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skill_gaps_student ON skill_gaps(student_id);

-- ============================================================
-- MICRO TASKS
-- ============================================================
CREATE TABLE micro_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skills_tested TEXT[] DEFAULT '{}',
  deadline TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_micro_tasks_company ON micro_tasks(company_id);
CREATE INDEX idx_micro_tasks_active ON micro_tasks(is_active);

-- ============================================================
-- TASK SUBMISSIONS
-- ============================================================
CREATE TABLE task_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES micro_tasks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_url TEXT NOT NULL,
  status task_status DEFAULT 'pending',
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(task_id, student_id)
);

CREATE INDEX idx_task_submissions_task ON task_submissions(task_id);
CREATE INDEX idx_task_submissions_student ON task_submissions(student_id);

-- ============================================================
-- CERTIFICATES
-- ============================================================
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  internship_id UUID REFERENCES internships(id) ON DELETE SET NULL,
  issuer_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  certificate_hash TEXT,
  certificate_url TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_certificates_student ON certificates(student_id);

-- ============================================================
-- VERIFICATIONS
-- ============================================================
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('company', 'internship', 'skill')),
  status verification_status DEFAULT 'pending',
  notes TEXT,
  verified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verifications_profile ON verifications(profile_id);
CREATE INDEX idx_verifications_status ON verifications(status);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient_created ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id, is_read, created_at DESC);

-- ============================================================
-- COLLEGE REPORTS
-- ============================================================
CREATE TABLE college_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tpo_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_college_reports_tpo ON college_reports(tpo_id);

-- ============================================================
-- COLLEGE COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS college_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_years INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, name)
);

CREATE INDEX IF NOT EXISTS idx_college_courses_college ON college_courses(college_id);

-- ============================================================
-- COLLEGE COMPANY REQUESTS (company approval by College/TPO)
-- ============================================================
CREATE TABLE IF NOT EXISTS college_company_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(college_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_ccr_college_status ON college_company_requests(college_id, status);
CREATE INDEX IF NOT EXISTS idx_ccr_company ON college_company_requests(company_id);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_company_requests ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- SAFE COLUMN ADDITIONS FOR EXISTING DBs
-- ============================================================
DO $$ BEGIN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_selected BOOLEAN DEFAULT FALSE;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS university TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expected_graduation INTEGER;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_roles TEXT[] DEFAULT '{}';
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_id UUID;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_email TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_id_url TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_verification_status TEXT DEFAULT 'pending';
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_verified_by UUID;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_verified_at TIMESTAMPTZ;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_verification_notes TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_official_email TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_website TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_verification_url TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS course_id UUID;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS course_name TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS year_of_study INTEGER;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_industry TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_size TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hr_contact TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_linkedin_url TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gst_number TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_document_url TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_details JSONB;
    ALTER TABLE internships ADD COLUMN IF NOT EXISTS college_id UUID;
    ALTER TABLE internships ADD COLUMN IF NOT EXISTS approved_by UUID;
    ALTER TABLE internships ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE internships ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- College courses: students can read, colleges manage their own
CREATE POLICY IF NOT EXISTS "Courses are viewable" ON college_courses FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Colleges manage own courses" ON college_courses
  FOR ALL USING (college_id = auth.uid()) WITH CHECK (college_id = auth.uid());

-- Company requests: companies create their own requests, colleges manage their own
CREATE POLICY IF NOT EXISTS "Companies create own partnership requests" ON college_company_requests
  FOR INSERT WITH CHECK (company_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Companies view own partnership requests" ON college_company_requests
  FOR SELECT USING (company_id = auth.uid() OR college_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Colleges manage partnership requests" ON college_company_requests
  FOR UPDATE USING (college_id = auth.uid());

-- Internships: everyone can read approved, companies manage own
CREATE POLICY "Approved internships are viewable" ON internships FOR SELECT USING (is_approved = true OR company_id = auth.uid());
CREATE POLICY "Companies can create internships" ON internships FOR INSERT WITH CHECK (company_id = auth.uid());
CREATE POLICY "Companies can update own internships" ON internships FOR UPDATE USING (company_id = auth.uid());

-- Applications: students manage own, companies see their internship apps
CREATE POLICY "Students see own applications" ON applications FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Companies see applications to their internships" ON applications FOR SELECT USING (
  internship_id IN (SELECT id FROM internships WHERE company_id = auth.uid())
);
CREATE POLICY "Students can apply" ON applications FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update own applications" ON applications FOR UPDATE USING (student_id = auth.uid());

-- Micro tasks: everyone can read active, companies manage own
CREATE POLICY "Active tasks are viewable" ON micro_tasks FOR SELECT USING (is_active = true OR company_id = auth.uid());
CREATE POLICY "Companies create tasks" ON micro_tasks FOR INSERT WITH CHECK (company_id = auth.uid());
CREATE POLICY "Companies update own tasks" ON micro_tasks FOR UPDATE USING (company_id = auth.uid());

-- Task submissions: students manage own, companies see submissions to their tasks
CREATE POLICY "Students see own submissions" ON task_submissions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Companies see task submissions" ON task_submissions FOR SELECT USING (
  task_id IN (SELECT id FROM micro_tasks WHERE company_id = auth.uid())
);
CREATE POLICY "Students submit tasks" ON task_submissions FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Companies review submissions" ON task_submissions FOR UPDATE USING (
  task_id IN (SELECT id FROM micro_tasks WHERE company_id = auth.uid())
);

-- Certificates: students see own, issuers manage
CREATE POLICY "Students see own certificates" ON certificates FOR SELECT USING (student_id = auth.uid() OR issuer_id = auth.uid());
CREATE POLICY "Issuers create certificates" ON certificates FOR INSERT WITH CHECK (issuer_id = auth.uid());

-- Skill gaps/vectors: students see own
CREATE POLICY "Students see own skill gaps" ON skill_gaps FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Insert own skill gaps" ON skill_gaps FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students see own vectors" ON skill_vectors FOR SELECT USING (true);
CREATE POLICY "Insert vectors" ON skill_vectors FOR INSERT WITH CHECK (true);

-- Verifications: viewable by admins, own profile
CREATE POLICY "View own verifications" ON verifications FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Insert verifications" ON verifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Update verifications" ON verifications FOR UPDATE USING (true);

-- Activity logs: users see own
CREATE POLICY "Users see own logs" ON activity_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Insert logs" ON activity_logs FOR INSERT WITH CHECK (user_id = auth.uid());

-- Notifications: recipients manage their own inbox
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- College reports: TPO manages own
CREATE POLICY "TPO sees own reports" ON college_reports FOR SELECT USING (tpo_id = auth.uid());
CREATE POLICY "TPO creates reports" ON college_reports FOR INSERT WITH CHECK (tpo_id = auth.uid());

-- ============================================================
-- FUNCTION: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCTION: Update timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_internships_updated_at BEFORE UPDATE ON internships FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_verifications_updated_at BEFORE UPDATE ON verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;
