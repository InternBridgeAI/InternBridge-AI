import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Users,
    Briefcase,
    Building2,
    AlertTriangle,
    TrendingUp,
    Clock,
    ShieldCheck,
    BarChart3,
    Search,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Basic counts
    const { count: studentCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
    const { count: companyCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'company');
    const { count: internshipCount } = await supabase.from('internships').select('*', { count: 'exact', head: true });
    const { count: pendingCompanies } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'company').eq('is_verified', false);
    const { data: pendingCompanyList } = await supabase
        .from('profiles')
        .select('id, company_name')
        .eq('role', 'company')
        .eq('is_verified', false)
        .order('created_at', { ascending: false })
        .limit(3);

    const integrityStatus = (pendingCompanies || 0) === 0 ? 'Operational' : 'Needs Review';

    // Recent logs
    const { data: recentLogs } = await supabase
        .from('activity_logs')
        .select('*, user:profiles!user_id(full_name, role)')
        .order('created_at', { ascending: false })
        .limit(5);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold">System Administration</h1>
                <p className="text-muted-foreground mt-2">Monitor platform health, verify partners, and manage user ecosystem.</p>
            </div>

            {/* Hero Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass border-primary/10 bg-primary/5">
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
                <Card className="glass border-orange-500/10 bg-orange-500/5">
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

            <div className="grid gap-6 md:grid-cols-7">
                {/* Analytics Overview */}
                <div className="md:col-span-4 space-y-6">
                    <Card className="glass h-[400px]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Usage Growth</CardTitle>
                                <CardDescription>New registrations vs Applications</CardDescription>
                            </div>
                            <BarChart3 className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="flex items-center justify-center border-dashed border-2 rounded-xl m-6 h-[280px]">
                            <div className="text-center">
                                <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No usage trend data yet</p>
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
                                {recentLogs && recentLogs.length > 0 ? (
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

                {/* Action Sidebar */}
                <div className="md:col-span-3 space-y-6">
                    <Card className="glass bg-orange-500/5 border-orange-500/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-500">
                                <AlertTriangle className="h-5 w-5" /> Verification Queue
                            </CardTitle>
                            <CardDescription>Companies waiting for vetting</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {pendingCompanies && pendingCompanies > 0 ? (
                                <div className="p-4 rounded-xl bg-background/50 border border-border/50 space-y-3">
                                    {pendingCompanyList?.length ? (
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
                        <div className="p-6">
                            <h4 className="font-bold flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-primary" /> Platform Insight
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Insights appear here once enough activity data is available.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
