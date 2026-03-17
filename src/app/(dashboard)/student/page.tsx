import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ArrowRight, Brain, CheckCircle, GraduationCap, Github, Briefcase, Linkedin, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DashboardError } from '@/components/dashboard/error-state';
import { fetchBackendJson } from '@/lib/backend-api';
import { SkillRadarChart } from '@/components/dashboard/skill-radar-chart';

export const dynamic = 'force-dynamic';

// This is a server component, but we want to fetch from our Python backend for AI matching and aggregation
export default async function StudentDashboard() {
    let profile: any = null;
    let applications: any[] = [];
    let internships: any[] = [];
    let analytics: any = null;
    let tasks: any[] = [];

    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        if (!token) {
            return <DashboardError message="You are not signed in. Please log in again." />;
        }

        const [profileRes, appsRes, internshipsRes, analyticsRes, tasksRes] = await Promise.all([
            fetchBackendJson('/api/auth/profile', headers),
            fetchBackendJson('/api/applications', headers),
            fetchBackendJson('/api/internships?status=active', headers),
            fetchBackendJson('/api/analytics', headers),
            fetchBackendJson('/api/tasks', headers),
        ]);

        profile = profileRes.success ? profileRes.data : null;
        applications = appsRes.data || [];
        internships = internshipsRes.data || [];
        analytics = analyticsRes.data;
        tasks = tasksRes.data || [];
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }

    if (!profile) {
        return <DashboardError />;
    }

    const completedApps = applications.filter((app: any) => app.status === 'accepted');
    const pendingApps = applications.filter((app: any) => app.status === 'pending');

    const userSkillsSet = new Set((profile?.skills || []).map((s: string) => s.toLowerCase()));

    // ... (rest of the logic for skills and completeness)
    const topMissingSkills = Array.isArray(analytics?.top_missing_skills) ? analytics.top_missing_skills : [];

    const profileCompleteness = Math.round(
        ((profile?.full_name ? 1 : 0) +
            (profile?.skills?.length ? 1 : 0) +
            (profile?.parsed_resume ? 1 : 0) +
            (profile?.github_username ? 1 : 0) +
            (profile?.linkedin_url ? 1 : 0) +
            (profile?.cgpa ? 1 : 0)) /
        6 *
        100
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
            .map(e => e[0]);
    }

    // Chart Data Preparation
    const allRelevantSkills = Array.from(new Set([
        ...(profile?.skills || []).slice(0, 4),
        ...finalMissingSkills.slice(0, 3)
    ]));

    const chartData = allRelevantSkills.slice(0, 6).map(skill => {
        const isUserSkill = userSkillsSet.has(skill.toLowerCase());
        const marketFrequency = internships.filter(i =>
            i.required_skills?.some((s: string) => s.toLowerCase() === skill.toLowerCase())
        ).length;

        // Normalize market demand (max 100)
        const marketScore = internships.length > 0
            ? Math.min(100, Math.round((marketFrequency / internships.length) * 200))
            : 50;

        return {
            subject: skill,
            student: isUserSkill ? 90 : 10,
            market: marketScore,
            fullMark: 100
        };
    });

    const connectedCollege = profile?.college_name || profile?.university || '';

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

            {/* Top Stats */}
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
                                <span className={cn("h-2 w-2 rounded-full", (profile?.github_username && profile?.linkedin_url) ? "bg-green-500" : "bg-yellow-500")} />
                                <div className="text-sm font-black tracking-tight uppercase">
                                    {profile?.github_username ? `@${profile.github_username}` : 'GitHub Pending'}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn("h-2 w-2 rounded-full", profile?.linkedin_url ? "bg-green-500" : "bg-red-500/20")} />
                                <div className="text-[10px] font-bold opacity-70 truncate">
                                    {profile?.linkedin_url ? 'LinkedIn Connected' : 'LinkedIn Missing'}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-7">
                {/* Main Section */}
                <div className="md:col-span-4 space-y-6">
                    <Card className="glass overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>AI Match Suggestions</CardTitle>
                                <p className="text-sm text-muted-foreground">Based on your verified skills</p>
                            </div>
                            <Link href="/student/internships" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                                View All <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border/50">
                                {internships && internships.length > 0 ? internships.slice(0, 3).map((internship: any) => {
                                    const matchScore = Math.min(
                                        99,
                                        Math.max(10, Math.round(((internship.required_skills?.filter((s: string) => userSkillsSet.has(s.toLowerCase())).length || 0) / (internship.required_skills?.length || 1)) * 100))
                                    );
                                    return (
                                        <div key={internship.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                            <div className="flex gap-4">
                                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <Brain className="h-6 w-6 text-primary" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold">{internship.title}</h4>
                                                    <p className="text-sm text-muted-foreground">{internship.profiles?.company_name || 'Company not listed'} • <span className="capitalize">{internship.type}</span></p>
                                                    <div className="flex gap-2 mt-2 flex-wrap">
                                                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">{matchScore}% Match</Badge>
                                                        {internship.required_skills?.slice(0, 2).map((skill: string) => (
                                                            <Badge key={skill} variant="outline">{skill}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <Link href="/student/internships" className={buttonVariants({ size: 'sm' })}>View</Link>
                                        </div>
                                    )
                                }) : (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No active internship matches found.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Past History & Challenges Section */}
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>History & Verification</CardTitle>
                            <p className="text-sm text-muted-foreground">Your past achievements and completed challenges</p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Internship History */}
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

                                {/* Challenges */}
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
                                    <Link href="/student/internships" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "mt-4")}>
                                        Find internships
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Section */}
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
                            <Link href="/student/skills" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "w-full mt-4 flex items-center justify-center font-bold uppercase tracking-wider text-[10px]")}>
                                View Learning Roadmap
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Professional Audit</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className={cn("flex items-center gap-3 p-3 rounded-lg border", profile?.github_username ? "bg-purple-500/5 border-purple-500/20" : "bg-muted/50 border-border/50")}>
                                <Github className={cn("h-6 w-6", profile?.github_username ? "text-purple-500" : "text-muted-foreground")} />
                                <div>
                                    <p className="text-xs font-bold italic">GitHub</p>
                                    <p className="text-[9px] text-muted-foreground uppercase font-semibold">
                                        {profile?.github_username ? 'Verified & Synced' : 'Action Required'}
                                    </p>
                                </div>
                                {profile?.github_username && <CheckCircle className="ml-auto h-4 w-4 text-green-500" />}
                            </div>
                            <div className={cn("flex items-center gap-3 p-3 rounded-lg border", profile?.linkedin_url ? "bg-blue-500/5 border-blue-500/20" : "bg-muted/50 border-border/50")}>
                                <Linkedin className={cn("h-6 w-6", profile?.linkedin_url ? "text-blue-500" : "text-muted-foreground")} />
                                <div>
                                    <p className="text-xs font-bold italic">LinkedIn</p>
                                    <p className="text-[9px] text-muted-foreground uppercase font-semibold">
                                        {profile?.linkedin_url ? 'Identity Linked' : 'Analysis Missing'}
                                    </p>
                                </div>
                                {profile?.linkedin_url && <CheckCircle className="ml-auto h-4 w-4 text-green-500" />}
                            </div>
                            <Link href="/student/profile" className={cn(buttonVariants({ variant: (profile?.github_username && profile?.linkedin_url) ? 'secondary' : 'default', size: 'sm' }), "w-full font-bold uppercase text-[10px] tracking-widest")}>
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
                            <Link href="/student/tasks" className={cn(buttonVariants({ variant: 'default', size: 'sm' }), "w-full mt-4 bg-white text-primary hover:bg-white/90 border-none font-black uppercase text-[10px] tracking-widest")}>
                                Explore Tasks
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
