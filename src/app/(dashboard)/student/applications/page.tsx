'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Briefcase, Calendar, Clock, ArrowUpRight, Search, Brain, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';

export default function ApplicationsPage() {
    const [applications, setApplications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const result = await apiFetch('/api/applications');
            if (result.success) {
                setApplications(result.data);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to load applications');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'accepted': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'interview': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Applications Tracking</h1>
                <p className="text-muted-foreground mt-2">Manage and track the status of your internship applications.</p>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />)}
                </div>
            ) : applications.length > 0 ? (
                <div className="grid gap-6">
                    {applications.map((app) => (
                        <Card key={app.id} className="glass hover:border-primary/30 transition-colors">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex gap-5">
                                        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                            <Briefcase className="h-7 w-7 text-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-bold">{app.internship?.title}</h3>
                                                <Badge className={`capitalize ${getStatusColor(app.status)}`}>{app.status}</Badge>
                                            </div>
                                            <p className="text-muted-foreground font-medium flex items-center gap-1.5">
                                                {app.internship?.company_name || 'Tech Company'}
                                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted border border-border/50 font-normal">
                                                    {app.internship?.type || 'Remote'}
                                                </span>
                                            </p>
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                                                <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Applied on {new Date(app.created_at).toLocaleDateString()}</div>
                                                <div className="flex items-center gap-1 text-primary/80 font-medium">
                                                    <Brain className="h-3.5 w-3.5" /> AI Match Score: {((app.match_score ?? 0) * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <Link href="/student/internships" className={buttonVariants({ variant: 'outline', size: 'sm' })}>View Internships</Link>
                                        {app.status === 'interview' && (
                                            <Button size="sm">Schedule Call</Button>
                                        )}
                                    </div>
                                </div>

                                {app.status === 'pending' && (
                                    <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-3">
                                        <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold">Under Review</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">The hiring team is currently reviewing your profile and AI match score. You'll receive a notification if you're shortlisted.</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="glass border-dashed border-2 py-20">
                    <CardContent className="flex flex-col items-center text-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-6">
                            <Briefcase className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold">No applications found</h3>
                        <p className="text-muted-foreground max-w-sm mt-2">You haven't applied to any internships yet. Start your journey by exploring recommendations.</p>
                        <Link href="/student/internships" className={buttonVariants({ className: 'mt-8' })}>Browse Internships</Link>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
