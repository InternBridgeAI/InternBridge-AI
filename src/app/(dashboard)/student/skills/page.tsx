'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, AlertTriangle, BookOpen, ExternalLink, CheckCircle2, Flame, Target, Sparkles, Rocket, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export default function SkillsPage() {
    const [data, setData] = useState<any>(null);
    const [roadmap, setRoadmap] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSkillData = async () => {
            try {
                const [skillResult, roadmapResult] = await Promise.allSettled([
                    apiFetch('/api/ai/skill-gaps'),
                    apiFetch('/api/ai/student-roadmap'),
                ]);

                if (skillResult.status === 'fulfilled' && skillResult.value.success) {
                    setData(skillResult.value.data);
                }

                if (roadmapResult.status === 'fulfilled' && roadmapResult.value.success) {
                    setRoadmap(roadmapResult.value.data);
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

            {roadmap && (
                <Card className="glass overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-background to-blue-500/[0.08] shadow-xl shadow-primary/5">
                    <CardContent className="p-6 md:p-7 space-y-6">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-2xl space-y-4">
                                <Badge className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-[0.2em] text-[10px] px-3 py-1">
                                    <Sparkles className="mr-1.5 h-3 w-3" /> AI Career Roadmap
                                </Badge>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black tracking-tight">{roadmap.headline}</h2>
                                    <p className="text-sm text-muted-foreground leading-6">
                                        {Array.isArray(roadmap.marketAdvice) && roadmap.marketAdvice.length > 0
                                            ? roadmap.marketAdvice[0]
                                            : 'The roadmap combines your current skill graph, proof signals, and live internship demand.'}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(roadmap.roleTargets || []).slice(0, 3).map((role: string) => (
                                        <Badge key={role} variant="outline" className="border-primary/20 bg-background/70 text-[11px] font-semibold">
                                            {role}
                                        </Badge>
                                    ))}
                                    {(roadmap.prioritySkills || []).slice(0, 2).map((skill: string) => (
                                        <Badge key={skill} className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-none">
                                            <Target className="mr-1 h-3 w-3" /> {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
                                <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Role Targets</p>
                                    <p className="mt-2 text-3xl font-black tracking-tight text-primary">{(roadmap.roleTargets || []).length}</p>
                                    <p className="text-xs text-muted-foreground mt-1">priority career lanes</p>
                                </div>
                                <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Skill Priorities</p>
                                    <p className="mt-2 text-3xl font-black tracking-tight">{(roadmap.prioritySkills || []).length}</p>
                                    <p className="text-xs text-muted-foreground mt-1">gaps worth closing next</p>
                                </div>
                                <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Proof Projects</p>
                                    <p className="mt-2 text-3xl font-black tracking-tight">{(roadmap.proofProjects || []).length}</p>
                                    <p className="text-xs text-muted-foreground mt-1">artifacts to build visibly</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                            <div className="rounded-2xl border border-border/60 bg-background/80 p-5">
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Next Best Moves</p>
                                        <p className="text-sm font-semibold mt-1">Highest-leverage actions for the next 30 days</p>
                                    </div>
                                    <Rocket className="h-4 w-4 text-primary" />
                                </div>
                                <div className="space-y-3">
                                    {(roadmap.nextSteps || []).slice(0, 4).map((step: any, index: number) => (
                                        <div key={`${step.title}-${index}`} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                            <p className="text-sm font-bold tracking-tight">{step.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1 leading-5">{step.why}</p>
                                            <p className="text-xs font-medium text-primary mt-2">{step.impact}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border/60 bg-background/80 p-5">
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Proof Projects</p>
                                        <p className="text-sm font-semibold mt-1">Build these to turn claims into evidence</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-primary" />
                                </div>
                                <div className="space-y-3">
                                    {(roadmap.proofProjects || []).slice(0, 3).map((project: any, index: number) => (
                                        <div key={`${project.title}-${index}`} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                            <p className="text-sm font-bold tracking-tight">{project.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1 leading-5">{project.why}</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {(project.skills || []).slice(0, 4).map((skill: string) => (
                                                    <Badge key={skill} variant="outline" className="text-[10px]">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <p className="text-xs font-medium text-primary mt-3">{project.deliverable}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

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
                        <p className="mt-6 text-xs text-muted-foreground">
                            Keep this score moving by pairing every new skill with visible proof, not just profile text.
                        </p>
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
                        <p className="text-xs text-muted-foreground">
                            Use these resources to close the market gaps above, then add project proof so recruiters can validate the new skill.
                        </p>
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
