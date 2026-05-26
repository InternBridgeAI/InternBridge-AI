import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Users, Briefcase, Award, TrendingUp, Search, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { fetchBackendJson } from '@/lib/backend-api';
import { CandidateRankingChart } from '@/components/dashboard/candidate-ranking-chart';

export const dynamic = 'force-dynamic';

export default async function CompanyDashboard() {
    let profile: any = null;
    let recentApps: any[] = [];
    let internshipsCount = 0;
    let totalApplications = 0;

    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        if (!token) {
            redirect('/login');
        }

        const [profileRes, appsRes, analyticsRes] = await Promise.all([
            fetchBackendJson('/api/auth/profile', headers),
            fetchBackendJson('/api/applications', headers),
            fetchBackendJson('/api/analytics', headers),
        ]);

        profile = profileRes?.data;
        recentApps = appsRes.data?.slice(0, 5) || [];
        internshipsCount = analyticsRes.data?.counts?.internships ?? analyticsRes.data?.total_internships ?? 0;
        totalApplications = analyticsRes.data?.counts?.applications ?? analyticsRes.data?.total_applications ?? 0;
    } catch (error) {
        console.error('Error fetching company dashboard data:', error);
    }

    const companyRankingData = [
        { name: 'Priyarka S.', skillMatch: 95, experience: 80, githubScore: 90 },
        { name: 'Rahul M.', skillMatch: 88, experience: 75, githubScore: 85 },
        { name: 'Ananya K.', skillMatch: 82, experience: 90, githubScore: 70 },
        { name: 'Vikram D.', skillMatch: 75, experience: 65, githubScore: 80 },
        { name: 'Sanya V.', skillMatch: 70, experience: 85, githubScore: 95 },
    ];
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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Company Dashboard</h1>
                    <p className="text-muted-foreground mt-2">Welcome back, {profile?.company_name || 'Partner'}. Manage your internship ecosystem.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" asChild>
                        <Link href="/company/tasks/new">
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

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Internships</CardTitle>
                        <Briefcase className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{internshipsCount || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Active listings: {internshipsCount || 0}</p>
                    </CardContent>
                </Card>
                <Card className="glass shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Applicants</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalApplications || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
                    </CardContent>
                </Card>
                <Card className="glass shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Avg. AI Match Score</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">76%</div>
                        <p className="text-xs text-muted-foreground mt-1 text-green-500 font-medium font-bold uppercase tracking-tighter">High Efficiency</p>
                    </CardContent>
                </Card>
                <Card className="glass shadow-sm">
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

            <div className="grid gap-6 md:grid-cols-7">
                {/* Recent Applicants */}
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
                                                    <p className="text-[10px] font-black uppercase text-primary tracking-tighter">AI FIT</p>
                                                    <p className="text-sm font-black">{(app.match_score * 100).toFixed(0)}%</p>
                                                </div>
                                                <Button size="sm" variant="default" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest px-4">Review</Button>
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

                    {/* Hiring & Verification History */}
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
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">No Verification History</p>
                                    <p className="text-[10px] text-muted-foreground opacity-60">Success stories will appear here.</p>
                                </div>
                            )}

                            {/* Challenge History (Mocked for UI prominence as requested) */}
                            <div className="mt-6 pt-6 border-t border-border">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Past Challenge Impact</h4>
                                <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold tracking-tight">System Architecture Refactor Challenge</p>
                                        <p className="text-[10px] text-muted-foreground">12 Participants • 4 Top Matches</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-primary">85% Fit Quality</p>
                                        <p className="text-[10px] text-muted-foreground">Completed Feb 2024</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Sidebar */}
                <div className="md:col-span-3 space-y-6">
                    <Card className="glass overflow-hidden border-primary/20 bg-primary/5 relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                            <Search size={80} />
                        </div>
                        <div className="p-6 space-y-4 relative z-10">
                            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground mb-4 shadow-lg shadow-primary/20">
                                <Users className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-black italic tracking-tighter underline decoration-primary decoration-2 underline-offset-4">TALENT SCOUT AIA</h3>
                            <p className="text-xs text-muted-foreground font-medium leading-relaxed">Reverse search students by skill similarity vectors. Find your perfect fit before they even apply.</p>
                            <Button className="w-full font-black uppercase text-[10px] tracking-widest h-10 rounded-xl shadow-lg hover:shadow-primary/10 transition-all" asChild>
                                <Link href="/company/candidates">Enter Discovery Mode</Link>
                            </Button>
                        </div>
                    </Card>

                    <Card className="glass h-[350px]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                                <TrendingUp className="h-3 w-3" /> Candidate Ranking Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[280px]">
                            <CandidateRankingChart data={companyRankingData} />
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest">Navigation</CardTitle>
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
                                <p className="text-[10px] font-black uppercase tracking-wide text-green-500">Tier 1 Verified</p>
                                <p className="text-[9px] text-muted-foreground font-bold">Priority Listing Active</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
