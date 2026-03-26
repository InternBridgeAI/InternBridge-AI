import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    AlertTriangle,
    ArrowRight,
    ArrowUpRight,
    BarChart3,
    Briefcase,
    Building2,
    Brain,
    Clock,
    ShieldCheck,
    Sparkles,
    Target,
    TrendingUp,
    Users,
} from 'lucide-react';
import Link from 'next/link';
import { fetchBackendJson } from '@/lib/backend-api';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    const token = session?.access_token;

    if (!user || !token) return null;

    let studentCount = 0;
    let companyCount = 0;
    let internshipCount = 0;
    let pendingCompanies = 0;
    let pendingCompanyList: Array<{ id: string; company_name: string | null }> = [];
    let recentLogs: any[] = [];
    let aiCopilot: any = null;
    let aiAnalytics: any = null;

    try {
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        const [
            studentCountRes,
            companyCountRes,
            internshipCountRes,
            pendingCompaniesRes,
            pendingCompaniesListRes,
            recentLogsRes,
            aiCopilotRes,
            aiAnalyticsRes,
        ] = await Promise.allSettled([
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'company'),
            supabase.from('internships').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'company').eq('is_verified', false),
            supabase
                .from('profiles')
                .select('id, company_name')
                .eq('role', 'company')
                .eq('is_verified', false)
                .order('created_at', { ascending: false })
                .limit(3),
            supabase
                .from('activity_logs')
                .select('*, user:profiles!user_id(full_name, role)')
                .order('created_at', { ascending: false })
                .limit(5),
            fetchBackendJson('/api/ai/admin-copilot', headers),
            fetchBackendJson('/api/ai/analytics', headers),
        ]);

        studentCount = studentCountRes.status === 'fulfilled' ? (studentCountRes.value.count || 0) : 0;
        companyCount = companyCountRes.status === 'fulfilled' ? (companyCountRes.value.count || 0) : 0;
        internshipCount = internshipCountRes.status === 'fulfilled' ? (internshipCountRes.value.count || 0) : 0;
        pendingCompanies = pendingCompaniesRes.status === 'fulfilled' ? (pendingCompaniesRes.value.count || 0) : 0;
        pendingCompanyList = pendingCompaniesListRes.status === 'fulfilled' ? ((pendingCompaniesListRes.value.data as any[]) || []) : [];
        recentLogs = recentLogsRes.status === 'fulfilled' ? ((recentLogsRes.value.data as any[]) || []) : [];
        aiCopilot = aiCopilotRes.status === 'fulfilled' && aiCopilotRes.value.success ? aiCopilotRes.value.data : null;
        aiAnalytics = aiAnalyticsRes.status === 'fulfilled' && aiAnalyticsRes.value.success ? aiAnalyticsRes.value.data : null;
    } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
    }

    const integrityStatus = (pendingCompanies || 0) === 0 ? 'Operational' : 'Needs Review';
    const copilotActions = Array.isArray(aiCopilot?.actions) ? aiCopilot.actions : [];
    const copilotWatchlist = Array.isArray(aiCopilot?.watchlist) ? aiCopilot.watchlist : [];
    const hotSkills = Array.isArray(aiCopilot?.hotSkills) ? aiCopilot.hotSkills : [];
    const queues = aiCopilot?.queues || {};
    const aiActionBreakdown = Array.isArray(aiAnalytics?.actionBreakdown) ? aiAnalytics.actionBreakdown : [];
    const aiVersionBreakdown = Array.isArray(aiAnalytics?.versionBreakdown) ? aiAnalytics.versionBreakdown : [];
    const aiRecentEvents = Array.isArray(aiAnalytics?.recentEvents) ? aiAnalytics.recentEvents : [];

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">System administration</h1>
                <p className="text-sm leading-6 text-muted-foreground">Monitor platform health, keep verification queues moving, and review live marketplace signals.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(studentCount || 0) + (companyCount || 0)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{studentCount || 0} Students | {companyCount || 0} Companies</p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Internships</CardTitle>
                        <Briefcase className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{internshipCount || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCompanies || 0}</div>
                        <p className="text-xs text-orange-500 font-medium mt-1">Action required</p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">System Integrity</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{integrityStatus}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {integrityStatus === 'Operational' ? 'No pending verification backlog' : 'Pending verifications require attention'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass overflow-hidden border-primary/20 bg-card">
                <CardContent className="p-6 md:p-7 space-y-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl space-y-4">
                            <Badge variant="outline" className="px-3 py-1">
                                <Sparkles className="mr-1.5 h-3 w-3" /> AI Platform Copilot
                            </Badge>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold tracking-tight">The marketplace now has a live operations brief.</h2>
                                <p className="text-sm text-muted-foreground leading-6">
                                    {aiCopilot?.summary || 'Current platform signals are stable. Review verification queues and watchlist items to keep trust and response times healthy.'}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {hotSkills.slice(0, 4).map((skill: string) => (
                                    <Badge key={skill} variant="outline" className="border-primary/20 bg-background/70 text-[11px] font-semibold">
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="grid w-full gap-3 sm:grid-cols-4 lg:max-w-2xl">
                            <div className="rounded-2xl border border-border/60 bg-background p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">System Health</p>
                                <p className="mt-2 text-3xl font-semibold tracking-tight text-primary">{aiCopilot?.systemHealthScore ?? 0}%</p>
                                <p className="text-xs text-muted-foreground mt-1">operational confidence</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Backlog</p>
                                <p className="mt-2 text-3xl font-semibold tracking-tight">{aiCopilot?.approvalBacklog ?? 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">approval items open</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Avg Match</p>
                                <p className="mt-2 text-3xl font-semibold tracking-tight">{aiCopilot?.avgMatchScore ?? 0}%</p>
                                <p className="text-xs text-muted-foreground mt-1">ecosystem fit quality</p>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trust Flags</p>
                                <p className="mt-2 text-3xl font-semibold tracking-tight">{aiCopilot?.trustFlags ?? 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">recent review incidents</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.8fr_1fr]">
                        <div className="rounded-2xl border border-border/60 bg-background p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Priority Actions</p>
                                    <p className="text-sm font-semibold mt-1">What needs admin attention first</p>
                                </div>
                                <Target className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-3">
                                {copilotActions.length > 0 ? copilotActions.map((action: any) => (
                                    <Link
                                        key={action.title}
                                        href={action.href || '/admin'}
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
                                        Admin actions will appear here when the platform sees queue pressure or trust alerts.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-background p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Queue Snapshot</p>
                                    <p className="text-sm font-semibold mt-1">Where approvals are waiting</p>
                                </div>
                                <ShieldCheck className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Companies', value: queues.companies ?? 0 },
                                    { label: 'Students', value: queues.students ?? 0 },
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
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-background p-5">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Watchlist</p>
                                    <p className="text-sm font-semibold mt-1">Platform areas that need monitoring</p>
                                </div>
                                <AlertTriangle className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-3">
                                {copilotWatchlist.length > 0 ? copilotWatchlist.map((item: any) => (
                                    <Link
                                        key={item.title}
                                        href={item.href || '/admin'}
                                        className="block rounded-2xl border border-border/60 bg-muted/40 p-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
                                    >
                                        <p className="text-sm font-bold tracking-tight">{item.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1 leading-5">{item.reason}</p>
                                    </Link>
                                )) : (
                                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                                        No urgent operational watchlist items right now.
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
                                <CardTitle>AI Governance</CardTitle>
                                <CardDescription>Prompt version, fallback, and runtime audit for the live AI layer</CardDescription>
                            </div>
                            <Brain className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="m-6 h-[280px] rounded-xl border border-border/60 bg-muted/10 p-5">
                            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                                <div className="space-y-4">
                                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                                        <div className="rounded-2xl border border-border/60 bg-background p-4">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI Calls</p>
                                            <p className="mt-2 text-3xl font-semibold tracking-tight text-primary">{aiAnalytics?.totalActions ?? 0}</p>
                                            <p className="text-xs text-muted-foreground mt-1">last {Math.round((aiAnalytics?.windowHours ?? 168) / 24)} days</p>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background p-4">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Success Rate</p>
                                            <p className="mt-2 text-3xl font-semibold tracking-tight">{aiAnalytics?.successRate ?? 0}%</p>
                                            <p className="text-xs text-muted-foreground mt-1">audited responses</p>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background p-4">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Fallback Rate</p>
                                            <p className="mt-2 text-3xl font-semibold tracking-tight">{aiAnalytics?.fallbackRate ?? 0}%</p>
                                            <p className="text-xs text-muted-foreground mt-1">non-LLM responses</p>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-border/60 bg-background p-4">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Prompt Versions</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {aiVersionBreakdown.length > 0 ? aiVersionBreakdown.slice(0, 4).map((item: any) => (
                                                <Badge key={item.promptVersion} variant="outline" className="bg-background/70">
                                                    {item.promptVersion} · {item.count}
                                                </Badge>
                                            )) : (
                                                <span className="text-sm text-muted-foreground">AI prompt versions will appear after live usage.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-border/60 bg-background p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Most Used Actions</p>
                                                <p className="text-sm font-semibold mt-1">Where the AI system is working hardest</p>
                                            </div>
                                            <BarChart3 className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            {aiActionBreakdown.length > 0 ? aiActionBreakdown.slice(0, 4).map((item: any) => (
                                                <div key={item.actionKey} className="rounded-xl border border-border/50 bg-muted/40 p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-sm font-bold tracking-tight">{item.actionKey.replace(/_/g, ' ')}</p>
                                                        <Badge variant="outline">{item.count}</Badge>
                                                    </div>
                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        Success {item.successRate}% · Fallback {item.fallbackRate}%
                                                    </p>
                                                </div>
                                            )) : (
                                                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                                                    No AI audit records yet. Run the live student and recruiter flows to populate the audit trail.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-border/60 bg-background p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recent AI Events</p>
                                                <p className="text-sm font-semibold mt-1">Latest runtime decisions</p>
                                            </div>
                                            <Clock className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            {aiRecentEvents.length > 0 ? aiRecentEvents.slice(0, 4).map((event: any) => (
                                                <div key={event.id} className="rounded-xl border border-border/50 bg-muted/40 px-3 py-2">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-sm font-semibold">{event.actionKey.replace(/_/g, ' ')}</p>
                                                        <Badge className={cn('border-none', event.usedFallback ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300')}>
                                                            {event.usedFallback ? 'Fallback' : 'Primary'}
                                                        </Badge>
                                                    </div>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {event.promptVersion} · {event.modelName} · {event.latencyMs}ms
                                                    </p>
                                                </div>
                                            )) : (
                                                <p className="text-sm text-muted-foreground">No recent AI runtime events yet.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Recent Activity Logs</CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/admin/logs">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentLogs.length > 0 ? (
                                    recentLogs.map((log: any) => (
                                        <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 text-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${log.user?.role === 'admin' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                                                    {log.user?.full_name?.[0] || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{log.user?.full_name} <span className="text-[10px] text-muted-foreground uppercase">({log.action})</span></p>
                                                    <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-[10px]">{log.user?.role}</Badge>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center py-8 text-muted-foreground">No recent logs found.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-3 space-y-6">
                    <Card className="glass bg-orange-500/5 border-orange-500/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-500">
                                <AlertTriangle className="h-5 w-5" /> Verification Queue
                            </CardTitle>
                            <CardDescription>Companies waiting for vetting</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {pendingCompanies > 0 ? (
                                <div className="p-4 rounded-xl bg-background/50 border border-border/50 space-y-3">
                                    {pendingCompanyList.length > 0 ? (
                                        <div className="space-y-2">
                                            {pendingCompanyList.map((company) => (
                                                <div key={company.id} className="flex items-center gap-3">
                                                    <Building2 className="h-5 w-5 text-muted-foreground" />
                                                    <p className="text-sm font-bold">{company.company_name || 'Company pending verification'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <Building2 className="h-5 w-5 text-muted-foreground" />
                                            <p className="text-sm font-bold">Companies awaiting verification</p>
                                        </div>
                                    )}
                                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" size="sm" asChild>
                                        <Link href="/admin/companies">Review {pendingCompanies} Pending</Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest text-center py-6 border border-dashed rounded-xl">
                                    No pending companies
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Quick Management</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2">
                            <Button variant="outline" className="h-20 flex flex-col gap-1" asChild>
                                <Link href="/admin/users">
                                    <Users className="h-5 w-5" />
                                    <span className="text-xs">Users</span>
                                </Link>
                            </Button>
                            <Button variant="outline" className="h-20 flex flex-col gap-1" asChild>
                                <Link href="/admin/internships">
                                    <Briefcase className="h-5 w-5" />
                                    <span className="text-xs">Internships</span>
                                </Link>
                            </Button>
                            <Button variant="outline" className="h-20 flex flex-col gap-1" asChild>
                                <Link href="/admin/fraud">
                                    <ShieldCheck className="h-5 w-5" />
                                    <span className="text-xs">Security</span>
                                </Link>
                            </Button>
                            <Button variant="outline" className="h-20 flex flex-col gap-1" asChild>
                                <Link href="/admin/logs">
                                    <Clock className="h-5 w-5" />
                                    <span className="text-xs">Audit Logs</span>
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="glass overflow-hidden border-primary/10 bg-primary/5">
                        <div className="p-6 space-y-3">
                            <h4 className="font-bold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" /> Market Pulse
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {hotSkills.length > 0
                                    ? `Current demand is clustering around ${hotSkills.slice(0, 3).join(', ')}. Keep approvals fast in those categories to avoid marketplace drag.`
                                    : 'Hot-skill demand will appear here as more verified internships go live.'}
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
