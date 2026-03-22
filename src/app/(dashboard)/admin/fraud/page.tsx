'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Github, Brain, CheckCircle, ArrowUpRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api-client';

export default function AdminFraudPage() {
    const [flags, setFlags] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadFlags = async () => {
            setIsLoading(true);
            try {
                const result = await apiFetch('/api/admin/fraud-signals?limit=20');
                if (result.success) {
                    setFlags(result.data || []);
                }
            } catch (error: any) {
                toast.error(error.message || 'Failed to load fraud signals');
            } finally {
                setIsLoading(false);
            }
        };

        loadFlags();
    }, []);

    const severityCount = {
        high: flags.filter((flag) => flag.severity === 'high').length,
        medium: flags.filter((flag) => flag.severity === 'medium').length,
        low: flags.filter((flag) => flag.severity === 'low').length,
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Security & Fraud Detection</h1>
                    <p className="text-muted-foreground mt-2">AI-driven monitoring for skill misrepresentation and profile integrity.</p>
                </div>
                <div className="flex items-center gap-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 px-4 py-2 rounded-lg border border-red-200 dark:border-red-900/50">
                    <ShieldAlert className="h-5 w-5" />
                    <span className="text-sm font-bold">{severityCount.high} High-Risk Flags</span>
                </div>
            </div>

            <div className="grid gap-6">
                {isLoading ? (
                    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : flags.length > 0 ? (
                    flags.map((flag) => (
                        <Card key={flag.id} className={`glass overflow-hidden border-l-4 ${flag.severity === 'high' ? 'border-l-red-500' : 'border-l-orange-500'}`}>
                            <CardContent className="p-6">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                                    <div className="flex items-center gap-4 lg:w-1/4">
                                        <div className={`h-12 w-12 rounded-full flex items-center justify-center border ${flag.severity === 'high' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-orange-50 border-orange-100 text-orange-500'}`}>
                                            <ShieldAlert className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold">{flag.subject}</p>
                                            <Badge variant={flag.severity === 'high' ? 'destructive' : 'warning'} className="text-[10px] h-4">
                                                {flag.type.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex-grow space-y-1">
                                        <p className="text-sm text-foreground/80 font-medium">{flag.reason}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <Brain className="h-3 w-3" /> AI confidence: <span className="text-primary font-bold">{Math.round((flag.confidence || 0) * 100)}%</span>
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 lg:ml-auto">
                                        <Button asChild size="sm" variant="outline" className="h-9 px-4">
                                            <Link href={flag.href || '/admin'}>
                                                Investigate <ArrowUpRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold">No fraud detected</h3>
                        <p className="text-muted-foreground">The platform integrity is looking great today.</p>
                    </div>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="glass">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Github className="h-4 w-4" /> Skill Verification Engine
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            GitHub-linked profiles contribute repository activity, language usage, and technology evidence to the trust model.
                            Missing code proof on high-claim profiles increases review priority instead of silently boosting scores.
                        </p>
                        <div className="p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 text-[11px] text-green-700 dark:text-green-400">
                            <CheckCircle className="h-3.5 w-3.5 inline mr-1" /> Current signal mix: {severityCount.high} high, {severityCount.medium} medium, {severityCount.low} low review items.
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Brain className="h-4 w-4" /> Resume Semantic Consistency
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Resume evidence, claimed skills, readiness score, verification state, and employer document quality are checked together.
                            This page surfaces outliers that need manual validation, not decorative alerts.
                        </p>
                        <Button variant="link" className="text-xs h-auto p-0 font-bold" asChild>
                            <Link href="/admin/logs">Review platform activity logs →</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
