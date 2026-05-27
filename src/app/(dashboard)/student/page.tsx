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
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}</h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">Here is your current progress across profile quality, opportunities, and applications.</p>
                    {connectedCollege && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground/80 bg-slate-100/60 dark:bg-slate-800/40 w-fit px-2.5 py-1 rounded-full border border-border/30">
                            <GraduationCap className="h-3.5 w-3.5 text-primary" />
                            <span>Connected: {connectedCollege}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
                <Card className="glass hover-lift border-none shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Market Readiness</CardTitle>
                        <Brain className="h-4.5 w-4.5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-primary tracking-tight">
                            {marketReadinessScore !== null ? `${marketReadinessScore}%` : 'N/A'}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {marketReadinessScore !== null ? 'Based on profile + resume' : 'No score yet'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass hover-lift border-none shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Applications</CardTitle>
                        <Briefcase className="h-4.5 w-4.5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold tracking-tight text-foreground">{applications?.length || 0}</div>
                        <p className="mt-1 text-xs text-muted-foreground">Active submissions</p>
                    </CardContent>
                </Card>
                <Card className="glass hover-lift border-none shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ecosystem Sync</CardTitle>
                        <CheckCircle className="h-4.5 w-4.5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold tracking-tight text-foreground">{profileCompleteness}%</div>
                        <p className="mt-1 text-xs text-muted-foreground">Profile integrity</p>
                    </CardContent>
                </Card>
                <Card className="glass hover-lift border-none shadow-[0_8px_30px_rgba(0,0,0,0.02)] overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                        <LinkIcon size={40} />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connected Ecosystem</CardTitle>
                        <div className="flex gap-1.5">
                            {profile?.github_username && <Github className="h-3.5 w-3.5 text-purple-500" />}
                            {profile?.linkedin_url && <Linkedin className="h-3.5 w-3.5 text-blue-500" />}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className={cn('h-2 w-2 rounded-full shrink-0', (profile?.github_username && profile?.linkedin_url) ? 'bg-green-500' : 'bg-amber-500')} />
                                <div className="text-xs font-bold truncate text-foreground">
                                    {profile?.github_username ? `@${profile.github_username}` : 'GitHub Pending'}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn('h-2 w-2 rounded-full shrink-0', profile?.linkedin_url ? 'bg-green-500' : 'bg-red-500/30')} />
                                <div className="truncate text-xs text-muted-foreground font-medium">
                                    {profile?.linkedin_url ? 'LinkedIn Connected' : 'LinkedIn Missing'}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass overflow-hidden border-none shadow-[0_8px_30px_rgba(0,0,0,0.02)] bg-gradient-to-br from-indigo-50/30 via-transparent to-purple-50/20 dark:from-slate-900/40 dark:via-transparent dark:to-purple-950/10">
                <CardContent className="p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl space-y-4">
                            <Badge variant="outline" className="px-3 py-1 border-primary/20 bg-background/50 backdrop-blur-sm text-xs font-bold text-primary">
                                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" /> AI Career Copilot
                            </Badge>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold tracking-tight text-foreground">Your next best moves are now prioritized.</h2>
                                <p className="text-sm text-muted-foreground leading-6">
                                    {aiCopilot?.summary || 'We are translating your resume, verified skills, and live openings into an action plan you can trust.'}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(aiCopilot?.roleFocus || []).slice(0, 3).map((role: string) => (
                                    <Badge key={role} variant="outline" className="border-border/60 bg-background text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                                        {role}
                                    </Badge>
                                ))}
                                {copilotStrengths.slice(0, 2).map((strength: string) => (
                                    <Badge key={strength} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-none px-2 py-0.5 text-[10px] font-bold">
                                        <ShieldCheck className="mr-1 h-3.5 w-3.5" /> {strength}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
                            <div className="rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 p-4 text-center sm:text-left">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ready Now</p>
                                <p className="mt-1 text-3xl font-extrabold tracking-tight text-primary">{aiCopilot?.readyNowCount ?? 0}</p>
                                <p className="text-[10px] text-muted-foreground mt-1 leading-4">roles inside your college network</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 p-4 text-center sm:text-left">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Strong Matches</p>
                                <p className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">{aiCopilot?.strongMatchCount ?? 0}</p>
                                <p className="text-[10px] text-muted-foreground mt-1 leading-4">roles with clear overlap</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 p-4 text-center sm:text-left">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Next Milestone</p>
                                <p className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">{aiCopilot?.nextMilestoneScore ?? marketReadinessScore ?? 0}%</p>
                                <p className="text-[10px] text-muted-foreground mt-1 leading-4">possible after next upgrade</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr_0.9fr]">
                        <div className="rounded-2xl bg-slate-50/40 dark:bg-slate-900/20 p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Priority Actions</p>
                                    <p className="text-sm font-bold mt-1 text-foreground">What to do next for outcomes</p>
                                </div>
                                <Target className="h-4.5 w-4.5 text-primary" />
                            </div>
                            <div className="space-y-3">
                                {copilotActions.length > 0 ? copilotActions.map((action: any) => (
                                    <Link
                                        key={action.title}
                                        href={action.href || '/student/profile'}
                                        className="group flex items-start gap-3 rounded-xl border-none bg-background/50 hover:bg-background/80 dark:bg-slate-950/40 dark:hover:bg-slate-950/70 p-3 transition-colors"
                                    >
                                        <div className={cn(
                                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                            action.priority === 'high' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
                                        )}>
                                            {action.priority === 'high' ? <Rocket className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold tracking-tight text-foreground">{action.title}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-4">{action.description}</p>
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="rounded-xl border border-dashed border-border/70 bg-background/30 p-4 text-xs text-muted-foreground leading-5 text-center">
                                        Your core AI signals are healthy. Keep applying to high-fit roles and deepen project quality.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50/40 dark:bg-slate-900/20 p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Signal Quality</p>
                                    <p className="text-sm font-bold mt-1 text-foreground">Recruiter trust indicators</p>
                                </div>
                                <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                            </div>
                            <div className="space-y-2.5">
                                {[
                                    { label: 'Resume Parsed', ready: !!copilotSignals.resume },
                                    { label: 'GitHub Verified', ready: !!copilotSignals.github },
                                    { label: 'LinkedIn Linked', ready: !!copilotSignals.linkedin },
                                    { label: 'College Verified', ready: !!copilotSignals.verification },
                                ].map((signal) => (
                                    <div key={signal.label} className="flex items-center justify-between rounded-xl bg-background/40 dark:bg-slate-950/20 px-3.5 py-2.5">
                                        <span className="text-xs font-bold text-foreground">{signal.label}</span>
                                        <Badge className={cn('border-none text-[9px] font-extrabold uppercase px-2 py-0.5', signal.ready ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300')}>
                                            {signal.ready ? 'Live' : 'Missing'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50/40 dark:bg-slate-900/20 p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Momentum</p>
                                    <p className="text-sm font-bold mt-1 text-foreground">Pipeline health this week</p>
                                </div>
                                <Briefcase className="h-4.5 w-4.5 text-primary" />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                {[
                                    { label: 'Pending', value: copilotMomentum.pendingApplications ?? pendingApps.length },
                                    { label: 'Shortlisted', value: copilotMomentum.shortlisted ?? 0 },
                                    { label: 'Interviews', value: copilotMomentum.interviews ?? 0 },
                                    { label: 'Accepted', value: copilotMomentum.accepted ?? completedApps.length },
                                ].map((metric) => (
                                    <div key={metric.label} className="rounded-xl bg-background/40 dark:bg-slate-950/20 p-3">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{metric.label}</p>
                                        <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{metric.value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3.5 rounded-xl bg-background/20 p-3 text-[10px] text-muted-foreground leading-4">
                                {copilotGaps.length > 0
                                    ? `Fastest unlock: ${copilotGaps.slice(0, 2).join(' + ')}.`
                                    : 'No major demand gaps flagged right now. Focus on stronger projects.'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
                <div className="space-y-6 lg:space-y-8 flex flex-col">
                    <Card className="glass border-none shadow-[0_8px_30px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col flex-1">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <div>
                                <CardTitle className="text-lg font-bold">AI Match Suggestions</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">Based on your verified skills and live college demand</p>
                            </div>
                            <Link href="/student/internships" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs')}>
                                View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 flex flex-col justify-center">
                            <div className="divide-y divide-border/30">
                                {featuredMatches.length > 0 ? featuredMatches.map((internship: any) => (
                                    <div key={internship.id} className="p-5 hover:bg-muted/30 transition-colors">
                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div className="flex gap-4">
                                                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                                    <Brain className="h-5.5 w-5.5 text-primary" />
                                                </div>
                                                <div className="space-y-3 min-w-0">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="font-bold text-sm tracking-tight text-foreground truncate">{internship.title}</h4>
                                                            <Badge className={cn('border-none text-[9px] font-extrabold uppercase px-1.5 py-0.5', toneClasses(internship.insight.fitTone))}>
                                                                {internship.insight.fitLabel} • {internship.insight.score}%
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                                            {internship.profiles?.company_name || internship.company?.company_name || 'Company not listed'} • <span className="capitalize">{internship.type}</span>
                                                        </p>
                                                    </div>
 
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(internship.insight.matchedSkills.length > 0 ? internship.insight.matchedSkills : internship.required_skills || [])
                                                            .slice(0, 3)
                                                            .map((skill: string) => (
                                                                <Badge key={skill} variant="outline" className="bg-background text-[9px] font-bold border-border/60">
                                                                    {skill}
                                                                </Badge>
                                                            ))}
                                                    </div>
 
                                                    <div className="space-y-1.5 rounded-xl bg-muted/40 p-3">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Why this fits</p>
                                                        <p className="text-xs font-semibold text-foreground leading-4">{internship.insight.summary}</p>
                                                        <p className="text-[10px] text-muted-foreground leading-4">{internship.insight.gapSummary}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <Link href="/student/internships" className={cn(buttonVariants({ size: 'sm' }), 'text-xs self-start md:self-auto shrink-0')}>View</Link>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center flex flex-col items-center justify-center">
                                        <div className="h-12 w-12 rounded-full bg-brand-500/10 flex items-center justify-center mb-3">
                                            <Sparkles className="h-6 w-6 text-brand-500" />
                                        </div>
                                        <h4 className="font-semibold text-sm">Finding your ideal match</h4>
                                        <p className="text-xs text-muted-foreground max-w-[280px] mt-1 leading-5">
                                            Complete your profile details, connect GitHub, and check back for matching opportunities.
                                        </p>
                                        <Link href="/student/internships" className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'mt-4 h-8 px-3 text-xs')}>
                                            Browse Internships
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass border-none shadow-[0_8px_30px_rgba(0,0,0,0.02)] mt-6 lg:mt-8">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-bold">Recent Applications</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pendingApps && pendingApps.length > 0 ? (
                                <div className="space-y-3">
                                    {pendingApps.map((app: any) => (
                                        <div key={app.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                                            <div className="min-w-0">
                                                <p className="font-bold text-xs text-foreground truncate">{app.internship?.title}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">{app.internship?.profiles?.company_name}</p>
                                            </div>
                                            <Badge
                                                className={cn(
                                                    'border-none text-[9px] font-extrabold uppercase px-2 py-0.5',
                                                    app.status === 'accepted' ? 'bg-green-500/10 text-green-600' : app.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-100 text-slate-600'
                                                )}
                                            >
                                                {app.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 flex flex-col items-center justify-center">
                                    <div className="h-11 w-11 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                                        <Briefcase className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <h4 className="font-bold text-sm">No active applications</h4>
                                    <p className="text-xs text-muted-foreground max-w-[280px] mt-1 leading-5">
                                        You haven't submitted any internship applications yet.
                                    </p>
                                    <Link href="/student/internships" className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'mt-4 h-8 px-4 text-xs')}>
                                        Find internships
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
 
                <div className="space-y-6 lg:space-y-8 flex flex-col">
                    <Card className="glass border-none shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col flex-1">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-bold">Skill Gap Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
                            <div className="h-[250px] -mt-2 -mb-2 flex items-center justify-center">
                                <SkillRadarChart data={chartData} />
                            </div>
 
                            <div className="space-y-4">
                                <p className="text-[10px] font-bold text-muted-foreground border-b pb-1.5 border-border uppercase tracking-wider">Critical Gaps</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {finalMissingSkills.length > 0 ? (
                                        finalMissingSkills.map((skill: string) => (
                                            <Badge key={skill} className="bg-destructive/10 text-destructive border-none text-[9px] font-bold uppercase px-2 py-0.5">
                                                {skill}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-xs text-muted-foreground font-medium">Your current skill profile aligns well with active demand.</p>
                                    )}
                                </div>
                            </div>
                            <Link href="/student/skills" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full text-xs h-9 flex items-center justify-center')}>
                                View Learning Roadmap
                            </Link>
                        </CardContent>
                    </Card>
 
                    <Card className="glass border-none shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-bold">Professional Audit</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3.5">
                            <div className="flex items-center gap-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 p-3.5">
                                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg shrink-0', profile?.github_username ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                                    <Github className="h-4.5 w-4.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-foreground">GitHub</p>
                                    <p className="text-[10px] text-muted-foreground leading-4 mt-0.5">
                                        {profile?.github_username ? 'Connected and synced for verification' : 'Connect profile for technical trust signals'}
                                    </p>
                                </div>
                                <Badge className={cn('border-none text-[9px] font-extrabold uppercase px-2 py-0.5', profile?.github_username ? 'bg-green-500/10 text-green-600' : 'bg-slate-100 text-slate-600')}>
                                    {profile?.github_username ? 'Live' : 'Missing'}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 p-3.5">
                                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg shrink-0', profile?.linkedin_url ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                                    <Linkedin className="h-4.5 w-4.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-foreground">LinkedIn</p>
                                    <p className="text-[10px] text-muted-foreground leading-4 mt-0.5">
                                        {profile?.linkedin_url ? 'Identity profile linked successfully' : 'Add public profile to improve recruiter trust'}
                                    </p>
                                </div>
                                <Badge className={cn('border-none text-[9px] font-extrabold uppercase px-2 py-0.5', profile?.linkedin_url ? 'bg-green-500/10 text-green-600' : 'bg-slate-100 text-slate-600')}>
                                    {profile?.linkedin_url ? 'Live' : 'Missing'}
                                </Badge>
                            </div>
                            <Link href="/student/profile" className={cn(buttonVariants({ variant: (profile?.github_username && profile?.linkedin_url) ? 'secondary' : 'default', size: 'sm' }), 'w-full text-xs h-9')}>
                                {(profile?.github_username && profile?.linkedin_url) ? 'Manage Connections' : 'Complete AI Audit'}
                            </Link>
                        </CardContent>
                    </Card>
 
                    <Card className="glass border-none shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-bold">History & Verification</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                                    <Briefcase size={12} /> Internship History
                                </h4>
                                {completedApps && completedApps.length > 0 ? (
                                    <div className="space-y-2">
                                        {completedApps.map((app: any) => (
                                            <div key={app.id} className="flex items-center justify-between rounded-xl bg-slate-50/50 dark:bg-slate-900/30 p-3">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-foreground truncate">{app.internship?.title}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">{app.internship?.profiles?.company_name} • Completed</p>
                                                </div>
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-extrabold uppercase px-2 py-0.5">Verified</Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-border/60 flex flex-col items-center justify-center text-center">
                                        <p className="text-xs font-semibold text-foreground">No completed internships yet</p>
                                        <p className="text-xs text-muted-foreground mt-1 max-w-[240px] leading-5">Apply to internship positions to build your verification history.</p>
                                        <Link href="/student/internships" className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'mt-3 h-8 px-3 text-xs')}>
                                            Explore Roles
                                        </Link>
                                    </div>
                                )}
                            </div>
 
                            <div>
                                <h4 className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                                    <CheckCircle size={12} /> Active Challenges
                                </h4>
                                {tasks && tasks.length > 0 ? (
                                    <div className="space-y-2">
                                        {tasks.slice(0, 3).map((task: any) => (
                                            <div key={task.id} className="flex items-center justify-between rounded-xl bg-slate-50/50 dark:bg-slate-900/30 p-3">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-foreground truncate">{task.title}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        {task.company?.company_name || 'Company Challenge'}
                                                    </p>
                                                </div>
                                                <Badge className="bg-brand-500/10 text-brand-600 border-none text-[9px] font-extrabold uppercase px-2 py-0.5">Open</Badge>
                                            </div>
                                        ))}
                                        <Link
                                            href="/student/tasks"
                                            className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                                        >
                                            View all challenges <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="p-6 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-border/60 flex flex-col items-center justify-center text-center">
                                        <p className="text-xs font-semibold text-foreground">No active challenges</p>
                                        <p className="text-xs text-muted-foreground mt-1 max-w-[240px] leading-5">Solve real company tasks to prove your skills to recruiters.</p>
                                        <Link href="/student/tasks" className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'mt-3 h-8 px-3 text-xs')}>
                                            Explore Challenges
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass border-none shadow-[0_8px_30px_rgba(0,0,0,0.02)] bg-slate-50/30 dark:bg-slate-900/10">
                        <CardContent className="p-5 space-y-2.5">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <CircleAlert className="h-4 w-4 text-primary shrink-0" />
                                <p className="text-xs font-bold text-foreground uppercase tracking-wider">How recommendations work</p>
                            </div>
                            <p className="text-xs leading-5 text-muted-foreground">
                                Recommendations are dynamically matched to your verified skills, git activity, and college-approved positions, keeping your profile explainable and recruiter-ready.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
