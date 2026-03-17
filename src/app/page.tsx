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
import { ThemeToggle } from '@/components/theme-toggle';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col">
            <PublicNavbar />

            <main className="flex-grow">
                {/* Hero Section */}
                <section className="pt-28 pb-16 px-6 relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/30 via-purple-500/10 to-pink-500/20 rounded-full blur-3xl -z-10 opacity-50 dark:opacity-20" />
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest mb-6 border border-primary/20">
                            <Sparkles size={12} /> AI-Powered Matching
                        </div>
                        <h1 className="text-4xl md:text-6xl font-extrabold text-foreground leading-[1.1] mb-6 tracking-tight">
                            Find Your Perfect<br />
                            <span className="gradient-text">Internship Match</span>
                        </h1>
                        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                            InternBridge AI uses advanced resume parsing, vector similarity matching, and GitHub skill verification
                            to connect talent with high-impact opportunities.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/register"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 h-12 text-sm font-bold uppercase tracking-wider text-white rounded-xl gradient-brand shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all outline-none"
                            >
                                Get Started Now <ArrowRight size={16} />
                            </Link>
                            <Link
                                href="#features"
                                className="w-full sm:w-auto inline-flex items-center justify-center px-8 h-12 text-sm font-bold uppercase tracking-wider text-muted-foreground border border-border rounded-xl hover:bg-muted/50 transition-all outline-none"
                            >
                                See How It Works
                            </Link>
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
