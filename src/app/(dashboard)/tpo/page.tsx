import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ArrowRight,
    ArrowUpRight,
    Award,
    BarChart3,
    Briefcase,
    FileSpreadsheet,
    GraduationCap,
    ShieldCheck,
    Sparkles,
    Target,
    TrendingUp,
    Users,
} from 'lucide-react';
import Link from 'next/link';
import { PlacementTrendChart } from '@/components/dashboard/placement-trend-chart';
import { SkillHeatmapChart } from '@/components/dashboard/skill-heatmap-chart';
import { fetchBackendJson } from '@/lib/backend-api';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TPODashboard() {
    let studentCount = 0;
    let placedCount = 0;
    let activeApps = 0;
    let avgMarketReadiness: number | null = null;
    let tpoPlacementData: { month: string; placements: number }[] = [];
    let tpoHeatmapData: { skill: string; proficiency: number; demand: number }[] = [];
    let recentPlacements: {
        id: string;
        studentName: string;
        internshipTitle: string;
        companyName: string;
        createdAt: string;
    }[] = [];
    let aiCopilot: any = null;

    try {
        const supabase = await createClient();
        const {
            data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token || !session?.user) {
            return null;
        }

        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        const [studentsRes, aiCopilotRes] = await Promise.allSettled([
            supabase
                .from('profiles')
                .select('id, skills, market_readiness_score')
                .eq('role', 'student')
                .eq('college_id', session.user.id),
            fetchBackendJson('/api/ai/tpo-copilot', headers),
        ]);

        const students = studentsRes.status === 'fulfilled' ? (studentsRes.value.data as any[]) || [] : [];
        aiCopilot = aiCopilotRes.status === 'fulfilled' && aiCopilotRes.value.success ? aiCopilotRes.value.data : null;

        const studentIds = students.map((student: any) => student.id);
        studentCount = studentIds.length;

        const marketScores = students
            .map((student: any) => student.market_readiness_score)
            .filter((score: any) => typeof score === 'number');
        avgMarketReadiness = marketScores.length > 0
            ? Math.round(marketScores.reduce((sum: number, score: number) => sum + score, 0) / marketScores.length)
            : null;

        let applications: any[] = [];
        if (studentIds.length > 0) {
            const { data: apps } = await supabase
                .from('applications')
                .select('id, status, created_at, student_id, internship_id')
                .in('student_id', studentIds);
            applications = apps || [];
        }

        placedCount = applications.filter((app: any) => app.status === 'accepted').length;
        activeApps = applications.filter((app: any) => ['pending', 'shortlisted', 'interview'].includes(app.status)).length;

        if (placedCount > 0) {
            const placementsByMonth = new Map<string, number>();
            for (const app of applications) {
                if (app.status !== 'accepted' || !app.created_at) continue;
                const date = new Date(app.created_at);
                const key = `${date.getFullYear()}-${date.getMonth()}`;
                placementsByMonth.set(key, (placementsByMonth.get(key) || 0) + 1);
            }

            const now = new Date();
            const months = Array.from({ length: 6 }, (_, idx) => {
                const date = new Date(now.getFullYear(), now.getMonth() - 5 + idx, 1);
                const key = `${date.getFullYear()}-${date.getMonth()}`;
                return {
                    key,
                    label: date.toLocaleString('en-US', { month: 'short' }),
                };
            });

            tpoPlacementData = months.map((month) => ({
                month: month.label,
                placements: placementsByMonth.get(month.key) || 0,
            })).filter((entry) => entry.placements > 0);
        }

        if (studentIds.length > 0) {
            const { data: placementRows } = await supabase
                .from('applications')
                .select('id, created_at, profiles!inner(full_name, college_id), internships!inner(title, company_id)')
                .eq('status', 'accepted')
                .eq('profiles.college_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(3);

            const companyIds = Array.from(new Set((placementRows || [])
                .map((row: any) => row.internships?.company_id)
                .filter(Boolean)));
            let companyMap: Record<string, string> = {};
            if (companyIds.length > 0) {
                const { data: companies } = await supabase
                    .from('profiles')
                    .select('id, company_name')
                    .in('id', companyIds);
                companyMap = Object.fromEntries((companies || []).map((company: any) => [company.id, company.company_name]));
            }

            recentPlacements = (placementRows || []).map((row: any) => ({
                id: row.id,
                studentName: row.profiles?.full_name || 'Student',
                internshipTitle: row.internships?.title || 'Internship',
                companyName: companyMap[row.internships?.company_id] || 'Company not listed',
                createdAt: row.created_at,
            }));
        }

        const skillCounts = new Map<string, number>();
        students.forEach((student: any) => {
            (student.skills || []).forEach((skill: string) => {
                const normalized = skill.trim();
                if (!normalized) return;
                skillCounts.set(normalized, (skillCounts.get(normalized) || 0) + 1);
            });
        });

        const topSkills = Array.from(skillCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const demandCounts = new Map<string, number>();
        if (topSkills.length > 0) {
            const { data: internships } = await supabase
                .from('internships')
                .select('required_skills')
                .eq('college_id', session.user.id);
            (internships || []).forEach((internship: any) => {
                (internship.required_skills || []).forEach((skill: string) => {
                    const normalized = skill.trim();
                    if (!normalized) return;
                    demandCounts.set(normalized, (demandCounts.get(normalized) || 0) + 1);
                });
            });
        }

        const maxDemand = Math.max(0, ...Array.from(demandCounts.values()));
        tpoHeatmapData = topSkills.map(([skill, count]) => ({
            skill,
            proficiency: studentCount > 0 ? Math.round((count / studentCount) * 100) : 0,
            demand: maxDemand > 0 ? Math.round(((demandCounts.get(skill) || 0) / maxDemand) * 100) : 0,
        }));
    } catch (error) {
        console.error('Error fetching TPO dashboard data:', error);
    }

    const topProficiencySkill = tpoHeatmapData[0]?.skill;
    const topDemandSkill = tpoHeatmapData.length > 0
        ? [...tpoHeatmapData].sort((a, b) => b.demand - a.demand)[0]?.skill
        : '';
    const copilotActions = Array.isArray(aiCopilot?.actions) ? aiCopilot.actions : [];
    const copilotWatchlist = Array.isArray(aiCopilot?.watchlist) ? aiCopilot.watchlist : [];
    const copilotStrengths = Array.isArray(aiCopilot?.strengths) ? aiCopilot.strengths : [];
    const copilotGaps = Array.isArray(aiCopilot?.criticalGaps) ? aiCopilot.criticalGaps : [];
    const queues = aiCopilot?.queues || {};

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Placement Office Portal</h1>
                    <p className="text-muted-foreground mt-2">Monitor student progress, analyze skill gaps, and track placement performance.</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/tpo/reports">
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Placement Report
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass border-primary/20 bg-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{studentCount || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Registered from your college</p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Placed Students</CardTitle>
                        <GraduationCap className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{placedCount || 0}</div>
                        <p className="text-xs text-green-600 font-medium mt-1">{(studentCount ? (placedCount / studentCount * 100).toFixed(1) : 0)}% Placement Rate</p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
                        <Briefcase className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeApps || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Pending outcomes</p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Market Readiness</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgMarketReadiness !== null ? `${avgMarketReadiness}%` : 'N/A'}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {avgMarketReadiness !== null ? 'Avg. student score' : 'No readiness scores yet'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-background to-blue-500/[0.08] shadow-xl shadow-primary/5">
                <CardContent className="p-6 md:p-7 space-y-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl space-y-4">
                            <Badge className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-[0.2em] text-[10px] px-3 py-1">
                                <Sparkles className="mr-1.5 h-3 w-3" /> AI Batch Copilot
                            </Badge>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black tracking-tight">Your college now has a live placement brief.</h2>
                                <p className="text-sm text-muted-foreground leading-6">
                                    {aiCopilot?.summary || 'Batch intelligence appears here when the TPO AI copilot is connected to live backend data.'}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {copilotStrengths.slice(0, 3).map((skill: string) => (
                                    <Badge key={skill} variant="outline" className="border-primary/20 bg-background/70 text-[11px] font-semibold">
                                        {skill}
                                    </Badge>
                                ))}
                                {copilotGaps.slice(0, 2).map((skill: string) => (
                                    <Badge key={skill} className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-none">
                                        <Target className="mr-1 h-3 w-3" /> {skill}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="grid w-full gap-3 sm:grid-cols-4 lg:max-w-2xl">
                            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Batch Health</p>
                                <p className="mt-2 text-3xl font-black tracking-tight text-primary">{aiCopilot?.batchHealthScore ?? 0}%</p>
                                <p className="text-xs text-muted-foreground mt-1">placement readiness</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Ready Students</p>
                                <p className="mt-2 text-3xl font-black tracking-tight">{aiCopilot?.readyStudents ?? 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">70%+ readiness</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Approval Queue</p>
                                <p className="mt-2 text-3xl font-black tracking-tight">{aiCopilot?.approvalQueue ?? 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">items blocking flow</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Placement Rate</p>
                                <p className="mt-2 text-3xl font-black tracking-tight">{aiCopilot?.placementRate ?? 0}%</p>
                                <p className="text-xs text-muted-foreground mt-1">accepted applications</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.8fr_1fr]">
                        <div className="rounded-2xl border border-border/60 bg-background/80 p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Priority Actions</p>
                                    <p className="text-sm font-semibold mt-1">What will move student outcomes fastest</p>
                                </div>
                                <Target className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-3">
                                {copilotActions.length > 0 ? copilotActions.map((action: any) => (
                                    <Link
                                        key={action.title}
                                        href={action.href || '/tpo'}
                                        className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
                                    >
                                        <div className={cn(
                                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                                            action.priority === 'high' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
                                        )}>
                                            {action.priority === 'high' ? <ShieldCheck className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold tracking-tight">{action.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1 leading-5">{action.description}</p>
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                                        TPO actions will appear here once the batch AI copilot sees queue pressure or skill imbalance.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-background/80 p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Queue Snapshot</p>
                                    <p className="text-sm font-semibold mt-1">Approvals affecting your batch</p>
                                </div>
                                <ShieldCheck className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Students', value: queues.students ?? 0 },
                                    { label: 'Companies', value: queues.companies ?? 0 },
                                    { label: 'Internships', value: queues.internships ?? 0 },
                                ].map((queue) => (
                                    <div key={queue.label} className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-2.5">
                                        <span className="text-sm font-medium">{queue.label}</span>
                                        <Badge className={cn('border-none', queue.value > 0 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300')}>
                                            {queue.value > 0 ? `${queue.value} Open` : 'Clear'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/10 p-3 text-xs text-muted-foreground leading-5">
                                {copilotGaps.length > 0
                                    ? `Most urgent skill gap right now: ${copilotGaps[0]}.`
                                    : 'No critical college-wide skill gap is dominating current internship demand.'}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-background/80 p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Watchlist</p>
                                    <p className="text-sm font-semibold mt-1">Signals to monitor this week</p>
                                </div>
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-3">
                                {copilotWatchlist.length > 0 ? copilotWatchlist.map((item: any) => (
                                    <Link
                                        key={item.title}
                                        href={item.href || '/tpo'}
                                        className="block rounded-2xl border border-border/60 bg-muted/20 p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
                                    >
                                        <p className="text-sm font-bold tracking-tight">{item.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1 leading-5">{item.reason}</p>
                                    </Link>
                                )) : (
                                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                                        No urgent college watchlist items right now.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-7">
                <div className="md:col-span-4 space-y-6">
                    <Card className="glass h-[400px]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Placement Trends</CardTitle>
                                <CardDescription>Monthly placement volume across departments</CardDescription>
                            </div>
                            <BarChart3 className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="h-[300px] mt-4">
                            <PlacementTrendChart data={tpoPlacementData} />
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Recent Placements</CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/tpo/students">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {recentPlacements.length > 0 ? (
                                <div className="space-y-4">
                                    {recentPlacements.map((placement) => (
                                        <div key={placement.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700">
                                                    <Award className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold">{placement.studentName}</p>
                                                    <p className="text-xs text-muted-foreground">{placement.internshipTitle} @ {placement.companyName}</p>
                                                </div>
                                            </div>
                                            <Badge variant="success" className="text-[10px]">VERIFIED</Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-muted-foreground font-bold uppercase tracking-widest">
                                    No placements recorded yet
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-3 space-y-6">
                    <Card className="glass bg-indigo-50/20 dark:bg-indigo-900/5 border-indigo-200/50">
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2 text-indigo-600">
                                <TrendingUp className="h-4 w-4" /> AI Skill Heatmap
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-muted-foreground">
                                {topProficiencySkill && topDemandSkill
                                    ? `Top proficiency: ${topProficiencySkill}. Highest demand: ${topDemandSkill}.`
                                    : 'No skill insights available yet.'}
                            </p>
                            <div className="h-[200px]">
                                <SkillHeatmapChart data={tpoHeatmapData} />
                            </div>
                            <Button className="w-full" size="sm" variant="outline" asChild>
                                <Link href="/tpo/skills">Detail Analysis</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <CardTitle className="text-sm">TPO Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="ghost" className="w-full justify-start gap-3" asChild>
                                <Link href="/tpo/students"><Users className="h-4 w-4" /> Student Tracking</Link>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start gap-3" asChild>
                                <Link href="/tpo/approvals"><ShieldCheck className="h-4 w-4" /> Approval Queue</Link>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start gap-3" asChild>
                                <Link href="/tpo/reports"><FileSpreadsheet className="h-4 w-4" /> Batch Reports</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="glass overflow-hidden border-green-200/50 bg-green-50/10 dark:bg-green-900/5">
                        <div className="p-6 space-y-3">
                            <h4 className="font-bold flex items-center gap-2">
                                <Award className="h-4 w-4 text-green-500" /> Placement Booster
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {placedCount > 0
                                    ? `${placedCount} placements recorded for your college so far. Keep nudging students with high readiness into fresh roles.`
                                    : 'No placement records yet. Invite companies to post internships and keep student verification moving.'}
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
