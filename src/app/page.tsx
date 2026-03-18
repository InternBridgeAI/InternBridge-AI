import Link from 'next/link';
import {
    Zap,
    Brain,
    GitBranch,
    Target,
    Shield,
    Users,
    BarChart3,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    GraduationCap,
    Building2,
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { Footer } from '@/components/layout/footer';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col">
            <PublicNavbar />

            <main className="flex-grow">
                {/* Hero Section */}
                <section className="relative overflow-hidden px-6 pb-20 pt-28">
                    <div className="absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.22),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(236,72,153,0.14),transparent_24%),radial-gradient(circle_at_55%_55%,rgba(14,165,233,0.12),transparent_30%)]" />
                    <div className="absolute left-0 top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
                    <div className="absolute right-0 top-32 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(15,23,42,0.04))] dark:bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.02))]" />

                    <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.94fr,1.06fr] lg:gap-16">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary shadow-sm">
                                <Sparkles size={12} /> AI-Powered Internship Matching
                            </div>

                            <h1 className="mt-6 text-4xl font-extrabold leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-7xl">
                                Find Your Perfect
                                <span className="mt-2 block gradient-text">Internship Match</span>
                            </h1>

                            <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-muted-foreground md:text-lg">
                                InternBridge AI combines resume intelligence, verified skill signals, and smart matching to connect
                                students, colleges, and companies inside one credible internship ecosystem.
                            </p>

                            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                                <Link
                                    href="/register"
                                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl gradient-brand px-8 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl sm:w-auto"
                                >
                                    Get Started Now <ArrowRight size={16} />
                                </Link>
                                <Link
                                    href="#features"
                                    className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-background/70 px-8 text-sm font-bold uppercase tracking-wider text-muted-foreground backdrop-blur transition-all hover:bg-muted/50 sm:w-auto"
                                >
                                    See How It Works
                                </Link>
                            </div>

                            <div className="mt-10 grid gap-4 sm:grid-cols-3">
                                {[
                                    { icon: <CheckCircle2 size={16} />, title: 'Verified Signals', desc: 'GitHub, resumes, and academic proof in one flow.' },
                                    { icon: <Users size={16} />, title: '3-Sided Network', desc: 'Students, colleges, and companies stay connected.' },
                                    { icon: <Shield size={16} />, title: 'Fraud Resistance', desc: 'Verification layers reduce fake profiles and noise.' },
                                ].map((item) => (
                                    <div
                                        key={item.title}
                                        className="rounded-2xl border border-border/70 bg-card/75 p-4 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/25"
                                    >
                                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            {item.icon}
                                        </div>
                                        <h3 className="text-sm font-bold tracking-tight text-foreground">{item.title}</h3>
                                        <p className="mt-1 text-xs font-medium leading-6 text-muted-foreground">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative mx-auto w-full max-w-3xl">
                            <div className="absolute -left-3 top-10 hidden rounded-2xl border border-border/70 bg-card/85 px-4 py-3 shadow-xl backdrop-blur lg:block">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                                        <GraduationCap size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Students</p>
                                        <p className="text-sm font-semibold text-foreground">Build trusted, skill-backed profiles</p>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute -right-4 bottom-12 hidden rounded-2xl border border-border/70 bg-card/90 px-4 py-3 shadow-xl backdrop-blur lg:block">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-500">
                                        <Building2 size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Companies</p>
                                        <p className="text-sm font-semibold text-foreground">Hire verified talent with less guesswork</p>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute left-12 top-0 hidden rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-primary shadow-lg lg:block">
                                Live Matching Flow
                            </div>

                            <div className="relative overflow-visible rounded-[2rem] border border-border/70 bg-card/80 p-3 shadow-[0_32px_90px_-35px_rgba(59,130,246,0.5)] backdrop-blur sm:p-5 lg:p-6">
                                <div className="absolute inset-x-12 top-0 h-24 rounded-full bg-gradient-to-r from-primary/20 via-fuchsia-500/10 to-cyan-500/15 blur-3xl" />
                                <div className="relative rounded-[1.5rem] border border-border/70 bg-gradient-to-br from-background via-background to-muted/30 p-4 sm:p-5 lg:p-6">
                                    <div className="mb-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-muted-foreground">InternBridge AI</p>
                                            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-foreground">A smarter first impression</h2>
                                        </div>
                                        <div className="rounded-2xl bg-primary/10 px-3 py-2 text-right text-primary">
                                            <p className="text-[10px] font-black uppercase tracking-[0.22em]">Engine</p>
                                            <p className="text-sm font-bold">AI + Verification</p>
                                        </div>
                                    </div>

                                    <div className="relative overflow-visible rounded-[1.9rem] border border-border/60 bg-gradient-to-br from-white via-white to-primary/5 px-1 pb-2 pt-3 dark:from-slate-950/80 dark:via-slate-950/70 dark:to-primary/10 sm:px-3 sm:pb-3 sm:pt-4 lg:px-4 lg:pb-4">
                                        <div className="pointer-events-none absolute inset-x-6 top-0 h-16 rounded-full bg-gradient-to-r from-primary/10 via-cyan-400/10 to-fuchsia-500/10 blur-2xl" />
                                        <div className="relative mx-auto w-full max-w-[860px]">
                                            <img
                                                src="/illustrations/internship-animate.svg"
                                                alt="Animated internship workflow illustration"
                                                className="block h-auto w-full scale-[1.05] object-contain"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                        {[
                                            { label: 'Profile intelligence', value: 'Resume + GitHub' },
                                            { label: 'Institution sync', value: 'College-linked' },
                                            { label: 'Hiring trust', value: 'Verified companies' },
                                        ].map((stat) => (
                                            <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/75 px-4 py-3">
                                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">{stat.label}</p>
                                                <p className="mt-2 text-sm font-bold text-foreground">{stat.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section id="features" className="py-20 px-6 bg-muted/30 relative">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
                                Our <span className="gradient-text">AI Core</span>
                            </h2>
                            <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                                Transforming the internship lifecycle with intelligent automation.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                {
                                    icon: <Brain size={20} />,
                                    title: 'AI Resume Parsing',
                                    desc: 'Gemini-powered extraction of skills and experience from raw PDF resumes.',
                                    color: 'from-blue-500/20 to-cyan-500/20',
                                    iconColor: 'bg-blue-500',
                                },
                                {
                                    icon: <Target size={20} />,
                                    title: 'Vector Matching',
                                    desc: 'HuggingFace embeddings for semantic similarity between profiles and jobs.',
                                    color: 'from-purple-500/20 to-pink-500/20',
                                    iconColor: 'bg-purple-500',
                                },
                                {
                                    icon: <GitBranch size={20} />,
                                    title: 'Skill Verification',
                                    desc: 'Automated GitHub contribution analysis to confirm real-world expertise.',
                                    color: 'from-emerald-500/20 to-teal-500/20',
                                    iconColor: 'bg-emerald-500',
                                },
                                {
                                    icon: <BarChart3 size={20} />,
                                    title: 'Gap Analysis',
                                    desc: 'Predictive modeling to identify and suggest missing critical skills.',
                                    color: 'from-amber-500/20 to-orange-500/20',
                                    iconColor: 'bg-amber-500',
                                },
                                {
                                    icon: <Shield size={20} />,
                                    title: 'Proof of Work',
                                    desc: 'Blockchain-inspired immutable verification for student achievements.',
                                    color: 'from-red-500/20 to-rose-500/20',
                                    iconColor: 'bg-red-500',
                                },
                                {
                                    icon: <Sparkles size={20} />,
                                    title: 'Smart Ranking',
                                    desc: 'Dynamic scoring based on market readiness and historical performance.',
                                    color: 'from-primary/20 to-purple-500/20',
                                    iconColor: 'bg-primary',
                                },
                            ].map((feature) => (
                                <div
                                    key={feature.title}
                                    className="group p-6 bg-card rounded-xl border border-border hover:border-primary/30 transition-all duration-300"
                                >
                                    <div className={`w-10 h-10 rounded-lg ${feature.iconColor} flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-black/10`}>
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-base font-bold text-foreground mb-2">{feature.title}</h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section id="how-it-works" className="py-20 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight">
                                Simple <span className="gradient-text">Process</span>
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-4 gap-8">
                            {[
                                { step: '01', title: 'Profile', desc: 'Sync LinkedIn & GitHub.' },
                                { step: '02', title: 'Analysis', desc: 'AI verifies your stack.' },
                                { step: '03', title: 'Matching', desc: 'Get ranked by fit.' },
                                { step: '04', title: 'Success', desc: 'Land your dream role.' },
                            ].map((item) => (
                                <div key={item.step} className="text-center group">
                                    <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center text-white text-base font-black mx-auto mb-5 group-hover:rotate-6 transition-transform shadow-md">
                                        {item.step}
                                    </div>
                                    <h3 className="text-sm font-bold text-foreground mb-1 tracking-wide">{item.title}</h3>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold uppercase tracking-tighter">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Roles */}
                <section id="roles" className="py-20 px-6 bg-muted/30">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { title: 'Students', icon: <GraduationCap size={20} />, items: ['AI Parsing', 'Skill Gap'] },
                                { title: 'Companies', icon: <Building2 size={20} />, items: ['Smart Ranking', 'Micro-tasks'] },
                                { title: 'Admin', icon: <Shield size={20} />, items: ['Verification', 'Security'] },
                                { title: 'College', icon: <Users size={20} />, items: ['TPO Access', 'Analytics'] },
                            ].map((role) => (
                                <div key={role.title} className="p-5 bg-card rounded-xl border border-border hover:shadow-md transition-all">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary">{role.icon}</div>
                                        <h3 className="font-bold text-sm tracking-tight">{role.title}</h3>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {role.items.map(i => (
                                            <li key={i} className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-primary" /> {i}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-20 px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="gradient-brand rounded-3xl p-12 text-white relative overflow-hidden shadow-2xl">
                            <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tighter italic">Ready to Bridge?</h2>
                            <p className="text-sm text-white/80 mb-8 max-w-md mx-auto font-bold uppercase tracking-widest leading-loose">
                                Join the future of internship matching today.
                            </p>
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center h-12 px-10 text-xs font-black uppercase tracking-widest bg-white text-primary rounded-xl hover:scale-105 transition-all shadow-xl"
                            >
                                Get Started Free
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
