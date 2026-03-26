import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowUpRight,
    Award,
    Brain,
    Briefcase,
    CheckCircle,
    PlusCircle,
    Search,
    ShieldCheck,
    Sparkles,
    Target,
    TrendingUp,
    Users,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { fetchBackendJson } from '@/lib/backend-api';
import { CandidateRankingChart } from '@/components/dashboard/candidate-ranking-chart';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function CompanyDashboard() {
    let profile: any = null;
    let recentApps: any[] = [];
    let internshipsCount = 0;
    let totalApplications = 0;
    let avgMatchScore: number | null = null;
    let aiCopilot: any = null;

    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const user = session?.user;

        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        if (!token || !user) {
            redirect('/login');
        }

        const [profileRes, appsRes, internshipsRes, copilotRes] = await Promise.allSettled([
            fetchBackendJson('/api/auth/profile', headers),
            fetchBackendJson('/api/applications', headers),
            supabase.from('internships').select('*', { count: 'exact', head: true }).eq('company_id', user.id),
            fetchBackendJson('/api/ai/company-copilot', headers),
        ]);

        profile = profileRes.status === 'fulfilled' ? profileRes.value?.data : null;
        recentApps = appsRes.status === 'fulfilled' ? (appsRes.value?.data?.slice(0, 5) || []) : [];
        internshipsCount = internshipsRes.status === 'fulfilled' ? (internshipsRes.value.count || 0) : 0;
        totalApplications = appsRes.status === 'fulfilled' ? (appsRes.value?.data?.length || 0) : 0;
        aiCopilot = copilotRes.status === 'fulfilled' && copilotRes.value.success ? copilotRes.value.data : null;

        const scores = (appsRes.status === 'fulfilled' ? (appsRes.value?.data || []) : [])
            .map((app: any) => app.match_score)
            .filter((score: any) => typeof score === 'number');
        avgMatchScore = scores.length > 0
            ? Math.round((scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length) * 100)
            : null;
    } catch (error) {
        console.error('Error fetching company dashboard data:', error);
    }

    const companyRankingData = (recentApps || [])
        .filter((app: any) => app.student)
        .slice(0, 5)
        .map((app: any) => {
            const skillCount = Array.isArray(app.student?.skills) ? app.student.skills.length : 0;
            return {
                name: (app.student?.full_name || 'Student').split(' ')[0],
                skillMatch: Math.round((app.match_score || 0) * 100),
                experience: Math.min(100, skillCount * 10),
                githubScore: app.student?.github_username ? 100 : 0,
            };
        });
    const pastHires = recentApps.filter((app: any) => app.status === 'accepted');

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold">Unable to load dashboard</h2>
                <p className="text-muted-foreground max-w-md">
                    We couldn't connect to the server to fetch your company profile. Please check your connection or try again later.
                </p>
                <Button asChild className="mt-4">
                    <a href="/company">Refresh Page</a>
                </Button>
            </div>
        );
    }

    const copilotActions = Array.isArray(aiCopilot?.actions) ? aiCopilot.actions : [];
    const hotSkills = Array.isArray(aiCopilot?.hotSkills) ? aiCopilot.hotSkills : [];
    const supplyGaps = Array.isArray(aiCopilot?.supplyGaps) ? aiCopilot.supplyGaps : [];
    const watchlist = Array.isArray(aiCopilot?.watchlist) ? aiCopilot.watchlist : [];
    const pipeline = aiCopilot?.pipeline || {};

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Company dashboard</h1>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Welcome back, {profile?.company_name || 'Partner'}. Review hiring activity and move the right candidates forward.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" asChild>
                        <Link href="/company/tasks">
                            <PlusCircle className="mr-2 h-4 w-4" /> Create Challenge
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/company/internships/new">
                            <PlusCircle className="mr-2 h-4 w-4" /> Post Internship
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Internships</CardTitle>
                        <Briefcase className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{internshipsCount || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Active listings: {internshipsCount || 0}</p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Applicants</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalApplications || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Across your internships</p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Avg. AI Match Score</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{aiCopilot?.avgMatchScore ?? avgMatchScore ?? 'N/A'}{(aiCopilot?.avgMatchScore ?? avgMatchScore) !== null ? '%' : ''}</div>
                        <p className="text-xs text-muted-foreground mt-1 text-green-500 font-medium font-bold uppercase tracking-tighter">
                            {(aiCopilot?.avgMatchScore ?? avgMatchScore) !== null ? 'From recent applicants' : 'No applicants yet'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Verified Hires</CardTitle>
                        <Award className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pastHires.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">From ecosystem</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass overflow-hidden border-primary/20 bg-card">
                <CardContent className="p-6 md:p-7 space-y-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl space-y-4">
                            <Badge variant="outline" className="px-3 py-1">
                                <Sparkles className="mr-1.5 h-3 w-3" /> AI Hiring Copilot
                            </Badge>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold tracking-tight">Your talent pipeline now has operating guidance.</h2>
                                <p className="text-sm text-muted-foreground leading-6">
                                    {aiCopilot?.summary || 'We are translating applicant quality, hiring velocity, and demand signals into clear recruiting actions.'}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {hotSkills.slice(0, 4).map((skill: string) => (
                                    <Badge key={skill} variant="outline" className="border-primary/20 bg-background/70 text-[11px] font-semibold">
                                        {skill}
                                    </Badge>
                                ))}
                                {profile?.is_verified && (
                                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-none">
                                        <ShieldCheck className="mr-1 h-3 w-3" /> Verified Partner
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
                            <div className="rounded-2xl border border-border/60 bg-background p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Hiring Health</p>
                                <p className="mt-2 text-3xl font-semibold tracking-tight text-primary">{aiCopilot?.hiringHealthScore ?? 0}%</p>
                                <p className="text-xs text-muted-foreground mt-1">overall recruiting momentum</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Strong Candidates</p>
                                <p className="mt-2 text-3xl font-semibold tracking-tight">{aiCopilot?.strongCandidates ?? 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">high-fit profiles in funnel</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Watchlist</p>
                                <p className="mt-2 text-3xl font-semibold tracking-tight">{watchlist.length}</p>
                                <p className="text-xs text-muted-foreground mt-1">roles needing attention</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_1fr]">
                        <div className="rounded-2xl border border-border/60 bg-background p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Priority Actions</p>
                                    <p className="text-sm font-semibold mt-1">The highest-leverage recruiting moves right now</p>
                                </div>
                                <Target className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-3">
                                {copilotActions.length > 0 ? copilotActions.map((action: any) => (
                                    <Link
                                        key={action.title}
                                        href={action.href || '/company/candidates'}
                                        className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/40 p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
                                    >
                                        <div className={cn(
                                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                                            action.priority === 'high' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
                                        )}>
                                            {action.priority === 'high' ? <Brain className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold tracking-tight">{action.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1 leading-5">{action.description}</p>
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                                        Your current AI hiring signals look healthy. Keep reviewing quickly and maintaining tight role briefs.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-background p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pipeline Snapshot</p>
                                    <p className="text-sm font-semibold mt-1">Where candidates are sitting now</p>
                                </div>
                                <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Pending', value: pipeline.pending ?? 0 },
                                    { label: 'Shortlisted', value: pipeline.shortlisted ?? 0 },
                                    { label: 'Interviews', value: pipeline.interviews ?? 0 },
                                    { label: 'Accepted', value: pipeline.accepted ?? 0 },
                                ].map((metric) => (
                                    <div key={metric.label} className="rounded-xl border border-border/50 bg-muted/40 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</p>
                                        <p className="mt-2 text-2xl font-semibold tracking-tight">{metric.value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/10 p-3 text-xs text-muted-foreground leading-5">
                                {supplyGaps.length > 0
                                    ? `Talent gap in your funnel: ${supplyGaps.slice(0, 2).join(' + ')}.`
                                    : 'Applicant supply currently covers your visible skill stack well.'}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-background p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Role Watchlist</p>
                                    <p className="text-sm font-semibold mt-1">Openings that need a faster decision</p>
                                </div>
                                <CheckCircle className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-3">
                                {watchlist.length > 0 ? watchlist.map((item: any) => (
                                    <Link
                                        key={item.title}
                                        href={item.href || '/company/candidates'}
                                        className="block rounded-2xl border border-border/60 bg-muted/40 p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
                                    >
                                        <p className="text-sm font-bold tracking-tight">{item.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1 leading-5">{item.reason}</p>
                                    </Link>
                                )) : (
                                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                                        No urgent role blockers detected right now.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-7">
                <div className="md:col-span-4 space-y-6">
                    <Card className="glass">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Recent Applicants</CardTitle>
                                <p className="text-sm text-muted-foreground">Top-ranked candidates waiting for review</p>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/company/candidates" className="text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                    View All <Search className="h-3 w-3 ml-1" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentApps && recentApps.length > 0 ? (
                                    recentApps.slice(0, 3).map((app: any) => (
                                        <div key={app.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {app.student?.full_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm tracking-tight">{app.student?.full_name}</p>
                                                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">{app.internship?.title}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-[10px] font-semibold uppercase text-primary tracking-tighter">AI FIT</p>
                                                    <p className="text-sm font-semibold">{((app.match_score || 0) * 100).toFixed(0)}%</p>
                                                </div>
                                                <Button size="sm" asChild className="h-8 rounded-lg text-[10px] font-semibold uppercase tracking-widest px-4">
                                                    <Link href={`/company/candidates?internship_id=${app.internship_id}`}>Review</Link>
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground border-dashed border-2 rounded-2xl bg-muted/5">
                                        <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm font-bold uppercase tracking-widest opacity-40">No applicants yet</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Talent History</CardTitle>
                            <p className="text-sm text-muted-foreground">Past successful placements and challenge completions</p>
                        </CardHeader>
                        <CardContent>
                            {pastHires.length > 0 ? (
                                <div className="space-y-3">
                                    {pastHires.map((app: any) => (
                                        <div key={app.id} className="flex items-center justify-between p-3 rounded-xl border border-green-500/20 bg-green-500/5">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                <div>
                                                    <p className="text-sm font-bold">{app.student?.full_name}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{app.internship?.title}</p>
                                                </div>
                                            </div>
                                            <Badge variant="success" className="text-[9px] h-5 px-2">Verified Hire</Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-2xl bg-muted/5">
                                    <Award className="h-8 w-8 text-muted-foreground opacity-20 mb-3" />
                                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">No Verification History</p>
                                    <p className="text-[10px] text-muted-foreground opacity-60">Success stories will appear here.</p>
                                </div>
                            )}

                            {pastHires.length === 0 && (
                                <div className="mt-6 pt-6 border-t border-border text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    No challenge history yet
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-3 space-y-6">
                    <Card className="glass overflow-hidden border-primary/20 bg-primary/5 relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                            <Search size={80} />
                        </div>
                        <div className="p-6 space-y-4 relative z-10">
                            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground mb-4 shadow-lg shadow-primary/20">
                                <Users className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-semibold tracking-tight">AI Recruiter Copilot</h3>
                            <p className="text-xs text-muted-foreground font-medium leading-relaxed">Search candidates by live fit, close backlog faster, and use AI-ranked recommendations before the market moves.</p>
                            <Button className="w-full font-semibold uppercase text-[10px] tracking-widest h-10 rounded-xl shadow-lg hover:shadow-primary/10 transition-all" asChild>
                                <Link href="/company/candidates">Enter Discovery Mode</Link>
                            </Button>
                        </div>
                    </Card>

                    <Card className="glass h-[350px]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                                <TrendingUp className="h-3 w-3" /> Candidate Ranking Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[280px]">
                            <CandidateRankingChart data={companyRankingData} />
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <CardTitle className="text-[10px] font-semibold uppercase tracking-widest">Navigation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1.5 p-3">
                            <Button variant="ghost" size="sm" className="w-full justify-start gap-3 h-8 text-[10px] font-bold uppercase tracking-tight" asChild>
                                <Link href="/company/internships"><Briefcase className="h-3.5 w-3.5 opacity-70" /> My Internships</Link>
                            </Button>
                            <Button variant="ghost" size="sm" className="w-full justify-start gap-3 h-8 text-[10px] font-bold uppercase tracking-tight" asChild>
                                <Link href="/company/tasks"><TrendingUp className="h-3.5 w-3.5 opacity-70" /> Micro-Tasks</Link>
                            </Button>
                            <Button variant="ghost" size="sm" className="w-full justify-start gap-3 h-8 text-[10px] font-bold uppercase tracking-tight" asChild>
                                <Link href="/company/certificates"><Award className="h-3.5 w-3.5 opacity-70" /> Certificates</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="glass border-green-500/20 bg-green-500/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 text-green-500/10 rotate-45">
                            <CheckCircle size={40} />
                        </div>
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                                <CheckCircle className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-green-500">
                                    {profile?.is_verified ? 'Verified Partner' : 'Verification Pending'}
                                </p>
                                <p className="text-[9px] text-muted-foreground font-bold">
                                    {profile?.is_verified ? 'Company profile approved' : 'Complete verification to unlock benefits'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
