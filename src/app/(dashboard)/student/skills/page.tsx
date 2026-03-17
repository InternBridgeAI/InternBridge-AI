'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, AlertTriangle, BookOpen, ExternalLink, CheckCircle2, Flame, Target } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export default function SkillsPage() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSkillData = async () => {
            try {
                const result = await apiFetch('/api/ai/skill-gaps');
                if (result.success) {
                    setData(result.data);
                }
            } catch (error: any) {
                toast.error(error.message || 'Failed to load analysis');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSkillData();
    }, []);

    if (isLoading) return <div className="p-8 text-center"><Brain className="h-8 w-8 animate-pulse mx-auto text-primary" /><p className="mt-4">Analyzing your skill graph...</p></div>;

    if (!data) return (
        <div className="p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-bold">Analysis Unavailable</h2>
            <p className="text-muted-foreground">We couldn't load your skill analysis. This could be due to a server error or a missing profile.</p>
            <Button onClick={() => window.location.reload()}>Retry Analysis</Button>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold">Skill Gap & Market Readiness</h1>
                <p className="text-muted-foreground mt-2">AI analysis of how your current skills align with real-world industry demands.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
                {/* Readiness Score Card */}
                <Card className="glass md:col-span-4 bg-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" /> Readiness Score
                        </CardTitle>
                        <CardDescription>Overall employability index</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center text-center">
                        <div className="relative h-40 w-40 flex items-center justify-center">
                            <svg className="h-full w-full transform -rotate-90">
                                <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                                <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={440} strokeDashoffset={440 - (440 * (data?.readinessScore || 0)) / 100} className="text-primary transition-all duration-1000" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black">{data?.readinessScore || 0}%</span>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Current Score</span>
                            </div>
                        </div>
                        <p className="mt-6 text-sm text-muted-foreground">You are ready for <strong>{data?.matchCount || 0}</strong> active roles in the system.</p>
                        <Button className="mt-6 w-full" variant="outline" size="sm">Download Skill Report</Button>
                    </CardContent>
                </Card>

                {/* Missing Skills / Gaps */}
                <Card className="glass md:col-span-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" /> Critical Skill Gaps
                        </CardTitle>
                        <CardDescription>Skills you lack that are requested in 70%+ of internships you match</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {data?.gaps?.missing?.map((skill: string) => (
                                <div key={skill} className="p-4 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold">{skill}</h4>
                                        <p className="text-xs text-muted-foreground">Found in {data?.gaps?.market_count?.[skill] || 0} listings</p>
                                    </div>
                                    <Badge variant="outline" className="text-red-500 border-red-200">High Impact</Badge>
                                </div>
                            )) || <p className="text-sm text-muted-foreground">No gaps identified.</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* Skill Heatmap / Current Skills */}
                <Card className="glass md:col-span-7">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" /> Verified Proficiency
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data?.topSkills?.length ? (
                            <div className="flex flex-wrap gap-2">
                                {data.topSkills.map((skill: string) => (
                                    <Badge key={skill} variant="secondary">{skill}</Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No verified skills found.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Learning Pathways */}
                <Card className="glass md:col-span-5 border-blue-200/50 bg-blue-50/10 dark:bg-blue-900/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-blue-500" /> Learning Path
                        </CardTitle>
                        <CardDescription>Curated resources to bridge your gaps</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {data?.recommendations?.map((rec: any, i: number) => (
                            <div key={i} className="group p-3 rounded-lg border border-border/50 bg-white/50 dark:bg-black/50 hover:border-blue-400 transition-colors cursor-pointer">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-sm font-bold group-hover:text-blue-600 transition-colors">{rec.title}</h4>
                                        <p className="text-[10px] text-muted-foreground opacity-70">{rec.provider} • {rec.level}</p>
                                    </div>
                                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </div>
                            </div>
                        )) || <p className="text-sm text-muted-foreground">No recommendations available.</p>}
                        <Button className="w-full mt-2" variant="outline">Browse All Courses</Button>
                    </CardContent>
                </Card>

                {/* Industry Trends */}
                <Card className="glass md:col-span-12">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Flame className="h-5 w-5 text-orange-500" /> Industry Demand Trends
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-8 justify-between">
                            {data?.industryDemand?.map((trend: any) => (
                                <div key={trend.skill} className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                        <TrendingUp className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Trending Skill</p>
                                        <p className="font-bold">{trend.skill}</p>
                                        <Badge variant="secondary" className="h-4 text-[8px] px-1 bg-green-500/10 text-green-600 border-none">{trend.demand} Demand</Badge>
                                    </div>
                                </div>
                            )) || <p className="text-sm text-muted-foreground">No trend data available.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
