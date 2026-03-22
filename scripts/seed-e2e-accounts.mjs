import crypto from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sharedPassword = process.env.E2E_TEST_PASSWORD || 'InternBridge123!';

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const seedIds = {
    internship: '00000000-0000-4000-8000-000000000101',
    application: '00000000-0000-4000-8000-000000000201',
    companyRequest: '00000000-0000-4000-8000-000000000301',
};

const accounts = {
    student: {
        email: process.env.E2E_STUDENT_EMAIL || 'qa.student@internbridge.ai',
        password: process.env.E2E_STUDENT_PASSWORD || sharedPassword,
        fullName: 'QA Student',
        role: 'student',
    },
    company: {
        email: process.env.E2E_COMPANY_EMAIL || 'qa.company@internbridge.ai',
        password: process.env.E2E_COMPANY_PASSWORD || sharedPassword,
        fullName: 'QA Hiring Manager',
        role: 'company',
    },
    tpo: {
        email: process.env.E2E_TPO_EMAIL || 'qa.tpo@internbridge.ai',
        password: process.env.E2E_TPO_PASSWORD || sharedPassword,
        fullName: 'QA Placement Office',
        role: 'tpo',
    },
    admin: {
        email: process.env.E2E_ADMIN_EMAIL || 'qa.admin@internbridge.ai',
        password: process.env.E2E_ADMIN_PASSWORD || sharedPassword,
        fullName: 'QA Platform Admin',
        role: 'admin',
    },
};

function normalizeSkills(skills) {
    const seen = new Set();
    const normalized = [];
    for (const skill of skills) {
        const cleaned = String(skill || '').trim();
        if (!cleaned) continue;
        const key = cleaned.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        normalized.push(cleaned);
    }
    return normalized;
}

function generateEmbedding(skills, dimensions = 128) {
    const normalized = normalizeSkills(skills);
    const vector = new Array(dimensions).fill(0);

    for (const token of normalized) {
        const digest = crypto.createHash('sha256').update(token.toLowerCase()).digest();
        for (let index = 0; index < 16; index += 4) {
            const bucket = digest.readUInt16BE(index) % dimensions;
            const sign = digest[index + 2] % 2 === 0 ? 1 : -1;
            const weight = 1 + (digest[index + 3] / 255);
            vector[bucket] += sign * weight;
        }
    }

    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (!norm) {
        return [];
    }

    return vector.map((value) => Number((value / norm).toFixed(8)));
}

async function findUserByEmail(email) {
    let page = 1;
    while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        const match = (data.users || []).find((user) => user.email?.toLowerCase() === email.toLowerCase());
        if (match) return match;
        if (!data.nextPage || data.nextPage === page) break;
        page = data.nextPage;
    }
    return null;
}

async function ensureUser(account) {
    const existing = await findUserByEmail(account.email);
    const attributes = {
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
            full_name: account.fullName,
            role: account.role,
            password_ready: true,
        },
    };

    if (existing) {
        const { data, error } = await supabase.auth.admin.updateUserById(existing.id, attributes);
        if (error) throw error;
        return data.user;
    }

    const { data, error } = await supabase.auth.admin.createUser(attributes);
    if (error) throw error;
    return data.user;
}

async function main() {
    const ensuredUsers = {};
    for (const [key, account] of Object.entries(accounts)) {
        ensuredUsers[key] = await ensureUser(account);
    }

    const nowIso = new Date().toISOString();
    const futureDeadline = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

    const studentSkills = ['React', 'Next.js', 'Node.js', 'JavaScript', 'Tailwind CSS', 'REST APIs'];
    const internshipSkills = ['React', 'Next.js', 'Node.js', 'REST APIs', 'SQL'];

    const studentId = ensuredUsers.student.id;
    const companyId = ensuredUsers.company.id;
    const tpoId = ensuredUsers.tpo.id;
    const adminId = ensuredUsers.admin.id;

    const profileRows = [
        {
            id: studentId,
            email: accounts.student.email,
            full_name: accounts.student.fullName,
            role: 'student',
            role_selected: true,
            is_onboarded: true,
            phone: '+91 9876543210',
            location: 'Pune, India',
            skills: studentSkills,
            skill_vector: generateEmbedding(studentSkills),
            parsed_resume: {
                summary: 'Frontend-leaning student who builds product-grade web experiences and ships small features quickly.',
                skills: studentSkills,
            },
            market_readiness_score: 78,
            github_username: 'qa-student',
            linkedin_url: 'https://www.linkedin.com/in/qa-student',
            college_id: tpoId,
            college_name: 'InternBridge Institute of Technology',
            university: 'InternBridge Institute of Technology',
            course_name: 'Computer Science',
            year_of_study: 3,
            expected_graduation: 2027,
            preferred_roles: ['Frontend Intern', 'Full Stack Intern'],
            cgpa: 8.4,
            student_verification_status: 'verified',
            student_verified_by: tpoId,
            student_verified_at: nowIso,
            updated_at: nowIso,
        },
        {
            id: companyId,
            email: accounts.company.email,
            full_name: accounts.company.fullName,
            role: 'company',
            role_selected: true,
            is_onboarded: true,
            company_name: 'Acme AI Labs',
            company_description: 'Applied AI company hiring students for product and platform internships.',
            company_website: 'https://acme-ai.example.com',
            company_industry: 'Artificial Intelligence',
            company_size: '51-200',
            hr_contact: 'talent@acme-ai.example.com',
            company_linkedin_url: 'https://www.linkedin.com/company/acme-ai-labs',
            is_verified: true,
            updated_at: nowIso,
        },
        {
            id: tpoId,
            email: accounts.tpo.email,
            full_name: accounts.tpo.fullName,
            role: 'tpo',
            role_selected: true,
            is_onboarded: true,
            college_name: 'InternBridge Institute of Technology',
            college_official_email: 'placements@internbridge.edu',
            college_website: 'https://internbridge.edu',
            updated_at: nowIso,
        },
        {
            id: adminId,
            email: accounts.admin.email,
            full_name: accounts.admin.fullName,
            role: 'admin',
            role_selected: true,
            is_onboarded: true,
            updated_at: nowIso,
        },
    ];

    const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileRows, { onConflict: 'id' });
    if (profileError) throw profileError;

    const { error: requestError } = await supabase
        .from('college_company_requests')
        .upsert({
            id: seedIds.companyRequest,
            college_id: tpoId,
            company_id: companyId,
            status: 'approved',
            notes: 'Seeded for authenticated QA flows.',
            requested_at: nowIso,
            decided_at: nowIso,
            decided_by: tpoId,
        }, { onConflict: 'college_id,company_id' });
    if (requestError) throw requestError;

    const { error: internshipError } = await supabase
        .from('internships')
        .upsert({
            id: seedIds.internship,
            company_id: companyId,
            college_id: tpoId,
            title: 'Full Stack Product Intern',
            description: 'Build responsive product features in Next.js, connect APIs, and work closely with the hiring team on weekly delivery goals.',
            required_skills: internshipSkills,
            skill_vector: generateEmbedding(internshipSkills),
            type: 'remote',
            is_paid: true,
            stipend: 15000,
            duration_weeks: 8,
            location: 'Remote',
            max_applicants: 40,
            is_approved: true,
            approved_by: adminId,
            approved_at: nowIso,
            is_active: true,
            deadline: futureDeadline,
            updated_at: nowIso,
        }, { onConflict: 'id' });
    if (internshipError) throw internshipError;

    const { error: applicationError } = await supabase
        .from('applications')
        .upsert({
            id: seedIds.application,
            student_id: studentId,
            internship_id: seedIds.internship,
            status: 'pending',
            match_score: 0.78,
            cover_letter: 'Seeded QA application for authenticated recruiter and student flow checks.',
            updated_at: nowIso,
        }, { onConflict: 'student_id,internship_id' });
    if (applicationError) throw applicationError;

    console.log(JSON.stringify({
        seeded: true,
        baseUrl: supabaseUrl,
        password: sharedPassword,
        accounts: Object.fromEntries(Object.entries(accounts).map(([key, value]) => [key, value.email])),
        internshipId: seedIds.internship,
    }, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
