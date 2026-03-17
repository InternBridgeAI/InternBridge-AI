-- ============================================================
-- InternBridge AI – Schema Update v1
-- ============================================================

-- 1. Skills Master Table (for normalized skill management)
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Resumes Table (for multiple resumes and versioning)
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resume_url TEXT NOT NULL,
  parsed_content JSONB,
  skill_vector FLOAT8[],
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Internship Feedback (for Mentor Evaluation and Performance Tracking)
CREATE TABLE IF NOT EXISTS internship_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES profiles(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  performance_metrics JSONB, -- For skill improvement analytics
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. OBE Mappings (for College/TPO Outcome Based Education)
CREATE TABLE IF NOT EXISTS obe_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  internship_id UUID NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  obe_outcome_code TEXT NOT NULL,
  description TEXT,
  attainment_level DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Row Level Security Policies for new tables
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE internship_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE obe_mappings ENABLE ROW LEVEL SECURITY;

-- Policies: Skills (Read for all)
CREATE POLICY "Everyone can view skills" ON skills FOR SELECT USING (true);

-- Policies: Resumes (Owner only)
CREATE POLICY "Students manage own resumes" ON resumes FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students insert own resumes" ON resumes FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students delete own resumes" ON resumes FOR DELETE USING (student_id = auth.uid());

-- Policies: Feedback (Companies/Mentors write, Students read)
CREATE POLICY "Students see own feedback" ON internship_feedback FOR SELECT USING (
  application_id IN (SELECT id FROM applications WHERE student_id = auth.uid())
);
CREATE POLICY "Companies create feedback" ON internship_feedback FOR INSERT WITH CHECK (
  mentor_id = auth.uid()
);

-- Policies: OBE Mappings (TPO and Companies)
CREATE POLICY "TPO and companies manage OBE" ON obe_mappings FOR SELECT USING (true);
CREATE POLICY "TPO/Companies manage mappings" ON obe_mappings FOR INSERT WITH CHECK (true);
