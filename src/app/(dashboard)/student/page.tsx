import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
    ArrowRight,
    ArrowUpRight,
    Brain,
    Briefcase,
    CheckCircle,
    CircleAlert,
    Github,
    GraduationCap,
    Link as LinkIcon,
    Linkedin,
    Rocket,
    ShieldCheck,
    Sparkles,
    Target,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DashboardError } from '@/components/dashboard/error-state';
import { fetchBackendJson } from '@/lib/backend-api';
import { SkillRadarChart } from '@/components/dashboard/skill-radar-chart';
import { buildMatchInsight } from '@/lib/ai-match';

export const dynamic = 'force-dynamic';

function toneClasses(tone: 'strong' | 'good' | 'stretch' | 'early') {
    if (tone === 'strong') {
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
    }
    if (tone === 'good') {
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
    }
    if (tone === 'stretch') {
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
    }
    return 'bg-muted text-muted-foreground border-border';
}

export default async function StudentDashboard() {
    let profile: any = null;
    let applications: any[] = [];
    let internships: any[] = [];
    let analytics: any = null;
    let tasks: any[] = [];
    let aiCopilot: any = null;

    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        if (!token) {
            return <DashboardError message="You are not signed in. Please log in again." />;
        }

        const [profileRes, appsRes, internshipsRes, analyticsRes, tasksRes, copilotRes] = await Promise.allSettled([
            fetchBackendJson('/api/auth/profile', headers),
            fetchBackendJson('/api/applications', headers),
            fetchBackendJson('/api/internships?status=active', headers),
            fetchBackendJson('/api/analytics', headers),
            fetchBackendJson('/api/tasks', headers),
            fetchBackendJson('/api/ai/student-copilot', headers),
        ]);

        profile = profileRes.status === 'fulfilled' && profileRes.value.success ? profileRes.value.data : null;
        applications = appsRes.status === 'fulfilled' ? (appsRes.value.data || []) : [];
        internships = internshipsRes.status === 'fulfilled' ? (internshipsRes.value.data || []) : [];
        analytics = analyticsRes.status === 'fulfilled' ? analyticsRes.value.data : null;
        tasks = tasksRes.status === 'fulfilled' ? (tasksRes.value.data || []) : [];
        aiCopilot = copilotRes.status === 'fulfilled' && copilotRes.value.success ? copilotRes.value.data : null;
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }

    if (!profile) {
        return <DashboardError />;
    }

    const completedApps = applications.filter((app: any) => app.status === 'accepted');
    const pendingApps = applications.filter((app: any) => app.status === 'pending');
    const userSkills = Array.isArray(profile?.skills) ? profile.skills : [];
    const userSkillsSet = new Set(userSkills.map((s: string) => s.toLowerCase()));
    const topMissingSkills = Array.isArray(analytics?.top_missing_skills) ? analytics.top_missing_skills : [];

    const profileCompleteness = Math.round(
        ((profile?.full_name ? 1 : 0) +
            (profile?.skills?.length ? 1 : 0) +
            (profile?.parsed_resume ? 1 : 0) +
            (profile?.github_username ? 1 : 0) +
            (profile?.linkedin_url ? 1 : 0) +
            (profile?.cgpa ? 1 : 0)) /
        6 *
        100,
    );
    const marketReadinessScore = typeof profile?.market_readiness_score === 'number'
        ? Math.round(profile.market_readiness_score)
        : null;

    let finalMissingSkills: string[] = topMissingSkills;
    if (finalMissingSkills.length === 0 && internships.length > 0) {
        const missingSkillsMap = new Map<string, number>();
        internships.forEach((internship: any) => {
            internship.required_skills?.forEach((skill: string) => {
                if (!userSkillsSet.has(skill.toLowerCase())) {
                    missingSkillsMap.set(skill, (missingSkillsMap.get(skill) || 0) + 1);
                }
            });
        });
        finalMissingSkills = Array.from(missingSkillsMap.entries())
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 3)
            .map((entry) => entry[0]);
    }

    const allRelevantSkills = Array.from(new Set([
        ...userSkills.slice(0, 4),
        ...finalMissingSkills.slice(0, 3),
    ]));

    const chartData = allRelevantSkills.slice(0, 6).map((skill) => {
        const isUserSkill = userSkillsSet.has(skill.toLowerCase());
        const marketFrequency = internships.filter((internship: any) =>
            internship.required_skills?.some((listedSkill: string) => listedSkill.toLowerCase() === skill.toLowerCase()),
        ).length;

        const marketScore = internships.length > 0
            ? Math.min(100, Math.round((marketFrequency / internships.length) * 200))
            : 50;

        return {
            subject: skill,
            student: isUserSkill ? 90 : 10,
            market: marketScore,
            fullMark: 100,
        };
    });

    const featuredMatches = internships
        .map((internship: any) => ({
            ...internship,
            insight: buildMatchInsight(internship.required_skills || [], userSkills),
        }))
        .sort((a: any, b: any) => b.insight.score - a.insight.score)
        .slice(0, 3);

    const connectedCollege = profile?.college_name || profile?.university || '';
    const copilotActions = Array.isArray(aiCopilot?.actions) ? aiCopilot.actions : [];
    const copilotSignals = aiCopilot?.signals || {};
    const copilotMomentum = aiCopilot?.momentum || {};
    const copilotStrengths = Array.isArray(aiCopilot?.strengths) ? aiCopilot.strengths : [];
    const copilotGaps = Array.isArray(aiCopilot?.topGaps) ? aiCopilot.topGaps : finalMissingSkills;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black tracking-tighter uppercase italic">Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'} 👋</h1>
                <p className="text-muted-foreground mt-2 font-medium">Your professional ecosystem is now AI-active.</p>
                {connectedCollege && (
                    <p className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-widest">
                        Connected College: {connectedCollege}
                    </p>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass shadow-sm border-primary/20 bg-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">Market Readiness</CardTitle>
                        <Brain className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-primary tracking-tighter">
                            {marketReadinessScore !== null ? `${marketReadinessScore}%` : 'N/A'}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">
                            {marketReadinessScore !== null ? 'Based on profile + resume' : 'No score yet'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">Applications</CardTitle>
                        <Briefcase className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tighter">{applications?.length || 0}</div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">Active submissions</p>
                    </CardContent>
                </Card>
                <Card className="glass shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">Ecosystem Sync</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tighter">{profileCompleteness}%</div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">Profile Integrity</p>
                    </CardContent>
                </Card>
                <Card className="glass shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <LinkIcon size={40} />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">Connected Ecosystem</CardTitle>
                        <div className="flex gap-2">
                            {profile?.github_username && <Github className="h-3 w-3 text-purple-500" />}
                            {profile?.linkedin_url && <Linkedin className="h-3 w-3 text-blue-500" />}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className={cn('h-2 w-2 rounded-full', (profile?.github_username && profile?.linkedin_url) ? 'bg-green-500' : 'bg-yellow-500')} />
                                <div className="text-sm font-black tracking-tight uppercase">
                                    {profile?.github_username ? `@${profile.github_username}` : 'GitHub Pending'}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn('h-2 w-2 rounded-full', profile?.linkedin_url ? 'bg-green-500' : 'bg-red-500/20')} />
                                <div className="text-[10px] font-bold opacity-70 truncate">
                                    {profile?.linkedin_url ? 'LinkedIn Connected' : 'LinkedIn Missing'}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-background to-blue-500/[0.08] shadow-xl shadow-primary/5">
                <CardContent className="p-6 md:p-7 space-y-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl space-y-4">
                            <Badge className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-[0.2em] text-[10px] px-3 py-1">
                                <Sparkles className="mr-1.5 h-3 w-3" /> AI Career Copilot
                            </Badge>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black tracking-tight">Your next best moves are now prioritized.</h2>
                                <p className="text-sm text-muted-foreground leading-6">
                                    {aiCopilot?.summary || 'We are translating your resume, verified skills, and live openings into an action plan you can trust.'}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(aiCopilot?.roleFocus || []).slice(0, 3).map((role: string) => (
                                    <Badge key={role} variant="outline" className="border-primary/20 bg-background/70 text-[11px] font-semibold">
                                        {role}
                                    </Badge>
                                ))}
                                {copilotStrengths.slice(0, 2).map((strength: string) => (
                                    <Badge key={strength} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-none">
                                        <ShieldCheck className="mr-1 h-3 w-3" /> {strength}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
                            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Ready Now</p>
                                <p className="mt-2 text-3xl font-black tracking-tight text-primary">{aiCopilot?.readyNowCount ?? 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">roles inside your college network</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Strong Matches</p>
                                <p className="mt-2 text-3xl font-black tracking-tight">{aiCopilot?.strongMatchCount ?? 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">roles with clear overlap</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Next Milestone</p>
                                <p className="mt-2 text-3xl font-black tracking-tight">{aiCopilot?.nextMilestoneScore ?? marketReadinessScore ?? 0}%</p>
                                <p className="text-xs text-muted-foreground mt-1">possible after your next upgrade</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.9fr]">
                        <div className="rounded-2xl border border-border/60 bg-background/80 p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Priority Actions</p>
                                    <p className="text-sm font-semibold mt-1">What to do next for the biggest outcome lift</p>
                                </div>
                                <Target className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-3">
                                {copilotActions.length > 0 ? copilotActions.map((action: any) => (
                                    <Link
                                        key={action.title}
                                        href={action.href || '/student/profile'}
                                        className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
                                    >
                                        <div className={cn(
                                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                                            action.priority === 'high' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
                                        )}>
                                            {action.priority === 'high' ? <Rocket className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold tracking-tight">{action.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1 leading-5">{action.description}</p>
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                                        Your core AI signals are healthy. Keep applying to high-fit roles and deepen project quality.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-background/80 p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Signal Quality</p>
                                    <p className="text-sm font-semibold mt-1">Trust signals recruiters care about</p>
                                </div>
                                <ShieldCheck className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Resume Parsed', ready: !!copilotSignals.resume },
                                    { label: 'GitHub Verified', ready: !!copilotSignals.github },
                                    { label: 'LinkedIn Linked', ready: !!copilotSignals.linkedin },
                                    { label: 'College Verified', ready: !!copilotSignals.verification },
                                ].map((signal) => (
                                    <div key={signal.label} className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-2.5">
                                        <span className="text-sm font-medium">{signal.label}</span>
                                        <Badge className={cn('border-none', signal.ready ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300')}>
                                            {signal.ready ? 'Live' : 'Missing'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-background/80 p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Momentum</p>
                                    <p className="text-sm font-semibold mt-1">Pipeline health this week</p>
                                </div>
                                <Briefcase className="h-4 w-4 text-primary" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Pending', value: copilotMomentum.pendingApplications ?? pendingApps.length },
                                    { label: 'Shortlisted', value: copilotMomentum.shortlisted ?? 0 },
                                    { label: 'Interviews', value: copilotMomentum.interviews ?? 0 },
                                    { label: 'Accepted', value: copilotMomentum.accepted ?? completedApps.length },
                                ].map((metric) => (
                                    <div key={metric.label} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</p>
                                        <p className="mt-2 text-2xl font-black tracking-tight">{metric.value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/10 p-3 text-xs text-muted-foreground leading-5">
                                {copilotGaps.length > 0
                                    ? `Fastest unlock right now: ${copilotGaps.slice(0, 2).join(' + ')}.`
                                    : 'No major demand gaps flagged right now. Focus on stronger projects and faster applications.'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-7">
                <div className="md:col-span-4 space-y-6">
                    <Card className="glass overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>AI Match Suggestions</CardTitle>
                                <p className="text-sm text-muted-foreground">Based on your verified skills and live college-specific demand</p>
                            </div>
                            <Link href="/student/internships" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                                View All <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border/50">
                                {featuredMatches.length > 0 ? featuredMatches.map((internship: any) => (
                                    <div key={internship.id} className="p-4 hover:bg-muted/40 transition-colors">
                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div className="flex gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                                    <Brain className="h-6 w-6 text-primary" />
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="font-semibold text-base tracking-tight">{internship.title}</h4>
                                                            <Badge className={cn('border', toneClasses(internship.insight.fitTone))}>
                                                                {internship.insight.fitLabel} • {internship.insight.score}%
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {internship.profiles?.company_name || internship.company?.company_name || 'Company not listed'} • <span className="capitalize">{internship.type}</span>
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        {(internship.insight.matchedSkills.length > 0 ? internship.insight.matchedSkills : internship.required_skills || [])
                                                            .slice(0, 3)
                                                            .map((skill: string) => (
                                                                <Badge key={skill} variant="outline" className="bg-background/80">
                                                                    {skill}
                                                                </Badge>
                                                            ))}
                                                    </div>

                                                    <div className="space-y-2 rounded-2xl border border-border/50 bg-muted/20 p-3">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Why this fits</p>
                                                        <p className="text-sm font-medium">{internship.insight.summary}</p>
                                                        <p className="text-xs text-muted-foreground">{internship.insight.gapSummary}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <Link href="/student/internships" className={buttonVariants({ size: 'sm' })}>View</Link>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No active internship matches found.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>History & Verification</CardTitle>
                            <p className="text-sm text-muted-foreground">Your past achievements and completed challenges</p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                        <Briefcase size={14} /> Internship History
                                    </h4>
                                    {completedApps && completedApps.length > 0 ? (
                                        <div className="space-y-3">
                                            {completedApps.map((app: any) => (
                                                <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-green-500/5">
                                                    <div>
                                                        <p className="font-bold text-sm">{app.internship?.title}</p>
                                                        <p className="text-[10px] text-muted-foreground font-semibold uppercase">{app.internship?.profiles?.company_name} • Completed</p>
                                                    </div>
                                                    <Badge variant="success" className="text-[10px]">Verified Hire</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-lg bg-muted/20 border border-dashed border-border flex flex-col items-center justify-center text-center">
                                            <p className="text-[11px] text-muted-foreground font-medium">No completed internships yet.</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">Apply to internships to build your history.</p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                        <CheckCircle size={14} /> Challenges
                                    </h4>
                                    {tasks && tasks.length > 0 ? (
                                        <div className="space-y-3">
                                            {tasks.slice(0, 3).map((task: any) => (
                                                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-primary/5">
                                                    <div>
                                                        <p className="font-bold text-sm">{task.title}</p>
                                                        <p className="text-[10px] text-muted-foreground font-semibold uppercase">
                                                            {task.company?.company_name || 'Company Challenge'}
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline" className="text-[9px] h-4">Open</Badge>
                                                </div>
                                            ))}
                                            <Link
                                                href="/student/tasks"
                                                className="text-[10px] text-primary font-bold uppercase mt-1 inline-flex items-center gap-1 hover:underline"
                                            >
                                                View all challenges
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-lg bg-muted/20 border border-dashed border-border flex flex-col items-center justify-center text-center">
                                            <p className="text-[11px] text-muted-foreground font-medium">No challenges available yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Recent Applications</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pendingApps && pendingApps.length > 0 ? (
                                <div className="space-y-4">
                                    {pendingApps.map((app: any) => (
                                        <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30">
                                            <div>
                                                <p className="font-medium text-sm">{app.internship?.title}</p>
                                                <p className="text-[11px] text-muted-foreground">{app.internship?.profiles?.company_name}</p>
                                            </div>
                                            <Badge
                                                variant={app.status === 'accepted' ? 'success' : app.status === 'pending' ? 'warning' : 'outline'}
                                                className="text-[10px]"
                                            >
                                                {app.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p className="text-sm">No active applications currently.</p>
                                    <Link href="/student/internships" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4')}>
                                        Find internships
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-3 space-y-6">
                    <Card className="glass bg-primary/5 border-primary/10">
                        <CardHeader>
                            <CardTitle>Skill Gap Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="h-[250px] -mt-4 -mb-4">
                                <SkillRadarChart data={chartData} />
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 border-b pb-1 border-primary/20">Critical Gaps</p>
                                <div className="flex flex-wrap gap-2">
                                    {finalMissingSkills.length > 0 ? (
                                        finalMissingSkills.map((skill: string) => (
                                            <Badge key={skill} variant="outline" className="text-destructive border-destructive/20 text-[10px] uppercase font-bold">{skill}</Badge>
                                        ))
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">AI Audit: 100% Alignment with current market trends.</p>
                                    )}
                                </div>
                            </div>
                            <Link href="/student/skills" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full mt-4 flex items-center justify-center font-bold uppercase tracking-wider text-[10px]')}>
                                View Learning Roadmap
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Professional Audit</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className={cn('flex items-center gap-3 p-3 rounded-lg border', profile?.github_username ? 'bg-purple-500/5 border-purple-500/20' : 'bg-muted/50 border-border/50')}>
                                <Github className={cn('h-6 w-6', profile?.github_username ? 'text-purple-500' : 'text-muted-foreground')} />
                                <div>
                                    <p className="text-xs font-bold italic">GitHub</p>
                                    <p className="text-[9px] text-muted-foreground uppercase font-semibold">
                                        {profile?.github_username ? 'Verified & Synced' : 'Action Required'}
                                    </p>
                                </div>
                                {profile?.github_username && <CheckCircle className="ml-auto h-4 w-4 text-green-500" />}
                            </div>
                            <div className={cn('flex items-center gap-3 p-3 rounded-lg border', profile?.linkedin_url ? 'bg-blue-500/5 border-blue-500/20' : 'bg-muted/50 border-border/50')}>
                                <Linkedin className={cn('h-6 w-6', profile?.linkedin_url ? 'text-blue-500' : 'text-muted-foreground')} />
                                <div>
                                    <p className="text-xs font-bold italic">LinkedIn</p>
                                    <p className="text-[9px] text-muted-foreground uppercase font-semibold">
                                        {profile?.linkedin_url ? 'Identity Linked' : 'Analysis Missing'}
                                    </p>
                                </div>
                                {profile?.linkedin_url && <CheckCircle className="ml-auto h-4 w-4 text-green-500" />}
                            </div>
                            <Link href="/student/profile" className={cn(buttonVariants({ variant: (profile?.github_username && profile?.linkedin_url) ? 'secondary' : 'default', size: 'sm' }), 'w-full font-bold uppercase text-[10px] tracking-widest')}>
                                {(profile?.github_username && profile?.linkedin_url) ? 'Manage Connections' : 'Complete AI Audit'}
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="glass overflow-hidden">
                        <div className="bg-gradient-to-br from-primary/90 to-blue-600 p-6 text-primary-foreground relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <GraduationCap size={80} />
                            </div>
                            <h3 className="font-black text-lg flex items-center gap-2 italic">
                                <GraduationCap className="h-5 w-5" /> CHALLENGES
                            </h3>
                            <p className="text-xs opacity-90 mt-2 font-medium leading-relaxed">Complete tasks from top companies and get directly hired.</p>
                            <Link href="/student/tasks" className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'w-full mt-4 bg-white text-primary hover:bg-white/90 border-none font-black uppercase text-[10px] tracking-widest')}>
                                Explore Tasks
                            </Link>
                        </div>
                    </Card>

                    <Card className="glass border-dashed border-border/70 bg-muted/10">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <CircleAlert className="h-4 w-4 text-primary" />
                                <p className="text-[10px] font-black uppercase tracking-[0.18em]">AI Trust Note</p>
                            </div>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Every recommendation shown here is tied to your live skill graph, verified identity signals, and openings approved for your college. That keeps the dashboard useful, explainable, and recruiter-ready.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
