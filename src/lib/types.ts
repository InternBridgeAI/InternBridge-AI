/** Database type definitions matching Supabase schema */

export type UserRole = 'student' | 'company' | 'admin' | 'tpo';

export type ApplicationStatus =
    | 'pending'
    | 'shortlisted'
    | 'interview'
    | 'accepted'
    | 'rejected'
    | 'withdrawn';

export type InternshipType = 'remote' | 'in-office' | 'hybrid';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    avatar_url: string | null;
    phone: string | null;
    created_at: string;
    updated_at: string;
    // Student-specific
    cgpa: number | null;
    skills: string[];
    projects: Record<string, unknown>[];
    github_username: string | null;
    resume_url: string | null;
    parsed_resume: Record<string, unknown> | null;
    skill_vector: number[] | null;
    market_readiness_score: number | null;
    college_name: string | null;
    // Company-specific
    company_name: string | null;
    company_description: string | null;
    company_website: string | null;
    company_logo_url: string | null;
    company_document_url: string | null;
    is_verified: boolean;
}

export interface Internship {
    id: string;
    company_id: string;
    title: string;
    description: string;
    required_skills: string[];
    skill_vector: number[] | null;
    type: InternshipType;
    is_paid: boolean;
    stipend: number | null;
    duration_weeks: number;
    location: string | null;
    max_applicants: number;
    is_approved: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deadline: string | null;
    // Joined fields
    company?: Profile;
    application_count?: number;
}

export interface Application {
    id: string;
    student_id: string;
    internship_id: string;
    status: ApplicationStatus;
    match_score: number | null;
    cover_letter: string | null;
    created_at: string;
    updated_at: string;
    // Joined fields
    student?: Profile;
    internship?: Internship;
}

export interface SkillGap {
    id: string;
    student_id: string;
    internship_id: string | null;
    missing_skills: string[];
    recommended_resources: Record<string, string>[];
    created_at: string;
}

export interface MicroTask {
    id: string;
    company_id: string;
    title: string;
    description: string;
    skills_tested: string[];
    deadline: string | null;
    is_active: boolean;
    created_at: string;
    company?: Profile;
}

export interface TaskSubmission {
    id: string;
    task_id: string;
    student_id: string;
    submission_url: string;
    status: 'pending' | 'passed' | 'failed';
    feedback: string | null;
    created_at: string;
    reviewed_at: string | null;
}

export interface Certificate {
    id: string;
    student_id: string;
    internship_id: string | null;
    issuer_id: string;
    title: string;
    description: string | null;
    certificate_hash: string | null;
    certificate_url: string | null;
    issued_at: string;
}

export interface Verification {
    id: string;
    profile_id: string;
    type: 'company' | 'internship' | 'skill';
    status: VerificationStatus;
    notes: string | null;
    verified_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ActivityLog {
    id: string;
    user_id: string;
    action: string;
    details: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
}

export interface CollegeReport {
    id: string;
    tpo_id: string;
    report_type: string;
    data: Record<string, unknown>;
    generated_at: string;
}

export interface AppNotification {
    id: string;
    recipient_id: string;
    actor_id: string | null;
    type: string;
    title: string;
    message: string;
    link: string | null;
    metadata: Record<string, unknown> | null;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
}

/** API response wrapper */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
