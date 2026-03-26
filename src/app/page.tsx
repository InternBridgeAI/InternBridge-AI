import Link from 'next/link';
import {
    ArrowRight,
    BarChart3,
    Brain,
    Building2,
    CheckCircle2,
    GitBranch,
    GraduationCap,
    Shield,
    Sparkles,
    Target,
    Users,
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { Footer } from '@/components/layout/footer';

const features = [
    {
        icon: <Brain size={18} />,
        title: 'Resume intelligence',
        description: 'Parse resumes, extract skills, and build structured candidate signals without manual review.',
    },
    {
        icon: <Target size={18} />,
        title: 'Match scoring',
        description: 'Rank internships and candidates with explainable AI signals instead of guesswork.',
    },
    {
        icon: <GitBranch size={18} />,
        title: 'Skill verification',
        description: 'Use GitHub and proof-of-work evidence to improve trust in student profiles.',
    },
    {
        icon: <BarChart3 size={18} />,
        title: 'Gap analysis',
        description: 'Show readiness gaps, market demand, and the next steps that move outcomes forward.',
    },
    {
        icon: <Shield size={18} />,
        title: 'Trust workflows',
        description: 'Support college, company, and document verification in one controlled system.',
    },
    {
        icon: <Users size={18} />,
        title: 'Shared ecosystem',
        description: 'Keep students, placement offices, and hiring teams working from the same source of truth.',
    },
];

const steps = [
    { step: '01', title: 'Set up profile', description: 'Student, company, and college users start with one verified onboarding flow.' },
    { step: '02', title: 'Activate AI', description: 'Resumes, skills, and hiring context are turned into structured signals.' },
    { step: '03', title: 'Review matches', description: 'Users see recommendations, fit reasoning, and operational next actions.' },
    { step: '04', title: 'Move faster', description: 'Applications, approvals, interviews, and notifications stay in one system.' },
];

const roleCards = [
    {
        title: 'Students',
        icon: <GraduationCap size={18} />,
        points: ['Build a verified profile', 'See why roles fit', 'Track readiness and actions'],
    },
    {
        title: 'Companies',
        icon: <Building2 size={18} />,
        points: ['Post internships faster', 'Rank candidates with evidence', 'Run hiring from one dashboard'],
    },
    {
        title: 'Placement offices',
        icon: <Users size={18} />,
        points: ['Monitor student readiness', 'Manage approvals', 'Track placement outcomes'],
    },
];

export default function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <PublicNavbar />

            <main className="flex-1">
                <section className="border-b border-border bg-background px-6 pb-16 pt-28">
                    <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground">
                                <Sparkles size={14} className="text-primary" />
                                AI-powered internship operations
                            </div>

                            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                                Verified internship matching for students, colleges, and hiring teams.
                            </h1>

                            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                                InternBridge brings resume intelligence, trust workflows, and explainable matching into one clean product experience.
                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href="/register"
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                                >
                                    Get started
                                    <ArrowRight size={16} />
                                </Link>
                                <Link
                                    href="#features"
                                    className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                                >
                                    Explore features
                                </Link>
                            </div>

                            <div className="mt-10 grid gap-3 sm:grid-cols-3">
                                {[
                                    { label: 'Trust', value: 'Verified profiles and documents' },
                                    { label: 'AI', value: 'Explainable matching and scoring' },
                                    { label: 'Workflow', value: 'Students, colleges, and companies synced' },
                                ].map((item) => (
                                    <div key={item.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                                        <p className="mt-2 text-sm font-medium leading-6 text-foreground">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass overflow-hidden rounded-[28px]">
                            <div className="border-b border-border px-6 py-5">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Operational overview</p>
                                        <p className="text-sm text-muted-foreground">A clean interface for AI-assisted internship workflows.</p>
                                    </div>
                                    <div className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                                        Live product preview
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr]">
                                <div className="rounded-3xl border border-border bg-muted/40 p-4">
                                    <img
                                        src="/illustrations/internship-animate.svg"
                                        alt="InternBridge workflow illustration"
                                        className="mx-auto h-auto w-full max-w-2xl object-contain"
                                    />
                                </div>

                                <div className="space-y-4">
                                    {[
                                        {
                                            title: 'Student signal quality',
                                            description: 'Resume, GitHub, and academic proof become one profile recruiters can trust.',
                                            tone: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
                                        },
                                        {
                                            title: 'Recruiter intelligence',
                                            description: 'Companies see fit scores, missing skills, and interview guidance instead of raw lists.',
                                            tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
                                        },
                                        {
                                            title: 'College oversight',
                                            description: 'Placement teams monitor readiness, approvals, and batch health in one place.',
                                            tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
                                        },
                                    ].map((item) => (
                                        <div key={item.title} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                                            <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.tone}`}>
                                                {item.title}
                                            </div>
                                            <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="features" className="px-6 py-16">
                    <div className="mx-auto max-w-7xl">
                        <div className="max-w-2xl">
                            <h2 className="text-3xl font-semibold tracking-tight">Core capabilities</h2>
                            <p className="mt-3 text-base leading-7 text-muted-foreground">
                                The product focuses on real hiring and placement problems: profile quality, candidate trust, matching clarity, and faster action.
                            </p>
                        </div>

                        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {features.map((feature) => (
                                <div key={feature.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        {feature.icon}
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{feature.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="border-y border-border bg-muted/30 px-6 py-16">
                    <div className="mx-auto max-w-7xl">
                        <div className="max-w-2xl">
                            <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
                            <p className="mt-3 text-base leading-7 text-muted-foreground">
                                A simple product flow that keeps AI useful and visible without turning the interface into a demo site.
                            </p>
                        </div>

                        <div className="mt-10 grid gap-4 lg:grid-cols-4">
                            {steps.map((item) => (
                                <div key={item.step} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-foreground">
                                        {item.step}
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold tracking-tight">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="roles" className="px-6 py-16">
                    <div className="mx-auto max-w-7xl">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-2xl">
                                <h2 className="text-3xl font-semibold tracking-tight">Built for every side of the ecosystem</h2>
                                <p className="mt-3 text-base leading-7 text-muted-foreground">
                                    Each role gets a cleaner workspace with the same data model and the same AI foundation.
                                </p>
                            </div>
                            <Link href="/register" className="text-sm font-semibold text-primary transition-colors hover:text-primary/80">
                                Create an account
                            </Link>
                        </div>

                        <div className="mt-10 grid gap-4 lg:grid-cols-3">
                            {roleCards.map((role) => (
                                <div key={role.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        {role.icon}
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold tracking-tight">{role.title}</h3>
                                    <ul className="mt-4 space-y-3">
                                        {role.points.map((point) => (
                                            <li key={point} className="flex items-start gap-3 text-sm text-muted-foreground">
                                                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                                                <span>{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-6 pb-16">
                    <div className="mx-auto max-w-7xl">
                        <div className="rounded-[28px] border border-border bg-card p-8 shadow-sm sm:p-10">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                <div className="max-w-2xl">
                                    <h2 className="text-3xl font-semibold tracking-tight">A more professional product experience, end to end.</h2>
                                    <p className="mt-3 text-base leading-7 text-muted-foreground">
                                        InternBridge is built to solve real workflow problems, not just showcase AI. Start with the role that matches you and move into the platform.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <Link href="/register" className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                                        Start onboarding
                                    </Link>
                                    <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                                        Sign in
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
