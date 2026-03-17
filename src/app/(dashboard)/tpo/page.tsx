import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    GraduationCap,
    Briefcase,
    BarChart3,
    TrendingUp,
    ArrowRight,
    Search,
    Users,
    Award,
    FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';
import { PlacementTrendChart } from '@/components/dashboard/placement-trend-chart';
import { SkillHeatmapChart } from '@/components/dashboard/skill-heatmap-chart';

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

    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token || !session?.user) {
            return null;
        }

        const { data: students } = await supabase
            .from('profiles')
            .select('id, skills, market_readiness_score')
            .eq('role', 'student')
            .eq('college_id', session.user.id);

        const studentIds = (students || []).map((student: any) => student.id);
        studentCount = studentIds.length;

        const marketScores = (students || [])
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
                companyMap = Object.fromEntries((companies || []).map((c: any) => [c.id, c.company_name]));
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
        (students || []).forEach((student: any) => {
            (student.skills || []).forEach((skill: string) => {
                const normalized = skill.trim();
                if (!normalized) return;
                skillCounts.set(normalized, (skillCounts.get(normalized) || 0) + 1);
            });
        });

        const topSkills = Array.from(skillCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        let demandCounts: Map<string, number> = new Map();
        if (topSkills.length > 0) {
            const { data: internships } = await supabase
                .from('internships')
                .select('required_skills');
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

            {/* TPO Stats */}
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

            <div className="grid gap-6 md:grid-cols-7">
                {/* Placement Chart */}
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

                {/* Action Sidebar */}
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
                                <Link href="/tpo/approvals"><GraduationCap className="h-4 w-4" /> Exclusive Internships</Link>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start gap-3" asChild>
                                <Link href="/tpo/reports"><FileSpreadsheet className="h-4 w-4" /> Batch Reports</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="glass overflow-hidden border-green-200/50 bg-green-50/10 dark:bg-green-900/5">
                        <div className="p-6">
                            <h4 className="font-bold flex items-center gap-2 mb-2">
                                <Award className="h-4 w-4 text-green-500" /> Placement Booster
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {placedCount > 0
                                    ? `${placedCount} placements recorded for your college so far.`
                                    : 'No placement records yet. Invite companies to post internships for your students.'}
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
