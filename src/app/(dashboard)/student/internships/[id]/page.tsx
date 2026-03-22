'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Brain, Briefcase, Clock, DollarSign, FileText, Loader2, MapPin, ShieldCheck, Sparkles, Target } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function InternshipDetailPage() {
    const params = useParams<{ id: string }>();
    const internshipId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    const [internship, setInternship] = useState<any | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [copilot, setCopilot] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPitching, setIsPitching] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [pitchPreview, setPitchPreview] = useState<any | null>(null);

    useEffect(() => {
        if (!internshipId) {
            return;
        }

        const load = async () => {
            setIsLoading(true);
            try {
                const [profileRes, internshipRes, copilotRes] = await Promise.all([
                    apiFetch('/api/auth/profile'),
                    apiFetch(`/api/internships/${internshipId}`),
                    apiFetch(`/api/ai/internship-copilot/${internshipId}`),
                ]);

                if (profileRes.success) {
                    setProfile(profileRes.data || null);
                }
                if (internshipRes.success) {
                    setInternship(internshipRes.data || null);
                }
                if (copilotRes.success) {
                    setCopilot(copilotRes.data || null);
                }
            } catch (error: any) {
                toast.error(error.message || 'Failed to load internship details');
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [internshipId]);

    const isVerified = profile?.student_verification_status === 'verified';
    const alreadyApplied = Boolean(copilot?.applicationStatus);

    const quickApplyPitch = useMemo(() => {
        if (!internship) {
            return '';
        }
        if (pitchPreview?.coverLetter) {
            return pitchPreview.coverLetter;
        }
        const matched = (copilot?.matchedSkills || []).slice(0, 2).join(' and ');
        const missing = copilot?.missingSkills?.[0];
        return [
            `I’m applying for ${internship.title} because my background aligns with ${matched || 'the role requirements'}.`,
            missing
                ? `I’m actively improving ${missing} to close the remaining gap fast.`
                : 'I can contribute quickly, communicate clearly, and ship with ownership.',
        ].join(' ');
    }, [copilot, internship, pitchPreview]);

    const generatePitch = async () => {
        if (!internshipId) {
            return;
        }
        setIsPitching(true);
        try {
            const result = await apiFetch('/api/ai/application-pitch', {
                method: 'POST',
                body: JSON.stringify({ internship_id: internshipId }),
            });
            if (result.success) {
                setPitchPreview(result.data || null);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to generate AI pitch');
        } finally {
            setIsPitching(false);
        }
    };

    const handleApply = async () => {
        if (!internshipId || !internship) {
            return;
        }
        setIsApplying(true);
        try {
            const result = await apiFetch('/api/applications', {
                method: 'POST',
                body: JSON.stringify({ internship_id: internshipId, cover_letter: quickApplyPitch }),
            });
            if (result.success) {
                toast.success(`Application submitted with AI match score ${(result.data.match_score * 100).toFixed(1)}%`);
                setCopilot((current: any) => ({ ...(current || {}), applicationStatus: result.data.status || 'pending' }));
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to submit application');
        } finally {
            setIsApplying(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-10 w-40 rounded-xl bg-muted/50 animate-pulse" />
                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                        <div className="h-64 rounded-3xl bg-muted/50 animate-pulse" />
                        <div className="h-56 rounded-3xl bg-muted/50 animate-pulse" />
                    </div>
                    <div className="h-[520px] rounded-3xl bg-muted/50 animate-pulse" />
                </div>
            </div>
        );
    }

    if (!internship || !copilot) {
        return (
            <Card className="glass border-dashed border-border">
                <CardContent className="py-16 text-center">
                    <Brain className="mx-auto mb-4 h-10 w-10 text-muted-foreground opacity-40" />
                    <h1 className="text-xl font-bold">Internship brief unavailable</h1>
                    <p className="mt-2 text-sm text-muted-foreground">This internship could not be loaded for your account.</p>
                    <Button className="mt-6" asChild>
                        <Link href="/student/internships">Back to internships</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-3">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/student/internships">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to internships
                    </Link>
                </Button>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">AI Role Brief</Badge>
                {alreadyApplied ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-none">Applied</Badge>
                ) : null}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                    <Card className="glass overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-background to-blue-500/[0.08] shadow-xl shadow-primary/5">
                        <CardContent className="p-6 md:p-7">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-4 max-w-3xl">
                                    <Badge className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-[0.2em] text-[10px] px-3 py-1">
                                        <Sparkles className="mr-1.5 h-3 w-3" /> AI Internship Copilot
                                    </Badge>
                                    <div className="space-y-3">
                                        <h1 className="text-3xl font-black tracking-tight">{internship.title}</h1>
                                        <p className="text-sm text-muted-foreground leading-6">
                                            {copilot.summary}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
                                            <Briefcase className="h-4 w-4" /> {internship.company?.company_name || 'Company'}
                                        </div>
                                        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
                                            <MapPin className="h-4 w-4" /> {internship.location || 'Remote'}
                                        </div>
                                        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
                                            <Clock className="h-4 w-4" /> {internship.duration_weeks || 0} weeks
                                        </div>
                                        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
                                            <DollarSign className="h-4 w-4" /> {internship.is_paid ? `₹${internship.stipend}` : 'Unpaid'}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:min-w-[180px]">
                                    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Fit Score</p>
                                        <p className="mt-2 text-3xl font-black tracking-tight text-primary">{copilot.fitScore}%</p>
                                        <p className="text-xs text-muted-foreground mt-1">{copilot.confidenceLabel}</p>
                                    </div>
                                    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Matched</p>
                                        <p className="mt-2 text-3xl font-black tracking-tight">{(copilot.matchedSkills || []).length}</p>
                                        <p className="text-xs text-muted-foreground mt-1">direct overlap signals</p>
                                    </div>
                                    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Primary Gap</p>
                                        <p className="mt-2 text-base font-black tracking-tight">{copilot.missingSkills?.[0] || 'No major gap'}</p>
                                        <p className="text-xs text-muted-foreground mt-1">fastest unlock</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Role Overview</CardTitle>
                            <CardDescription>What the company is asking for and how to position yourself.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-2">Description</p>
                                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{internship.description}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-2">Required Skills</p>
                                <div className="flex flex-wrap gap-2">
                                    {(internship.required_skills || []).map((skill: string) => (
                                        <Badge key={skill} variant="secondary" className="text-[11px]">{skill}</Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Why This Fits</p>
                                    <div className="mt-3 space-y-2">
                                        {(copilot.whyThisFits || []).map((reason: string, index: number) => (
                                            <div key={`${reason}-${index}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                <ArrowRight className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                                                <span>{reason}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Evidence Checklist</p>
                                    <div className="mt-3 space-y-2">
                                        {(copilot.evidenceChecklist || []).map((item: string, index: number) => (
                                            <div key={`${item}-${index}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" />
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {pitchPreview ? (
                        <Card className="glass border-primary/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" /> AI Application Pitch
                                </CardTitle>
                                <CardDescription>
                                    Tailored talking points and cover letter for this internship.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                                    <div className="space-y-4">
                                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Matched Skills</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {(pitchPreview.matchedSkills || []).map((skill: string) => (
                                                    <Badge key={skill} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-none">
                                                        <ShieldCheck className="mr-1 h-3 w-3" /> {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        {(pitchPreview.missingSkills || []).length > 0 ? (
                                            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Watchouts</p>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {pitchPreview.missingSkills.map((skill: string) => (
                                                        <Badge key={skill} variant="outline">{skill}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="space-y-4">
                                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Cover Letter</p>
                                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{pitchPreview.coverLetter}</p>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Talking Points</p>
                                            <div className="mt-3 space-y-2">
                                                {(pitchPreview.talkingPoints || []).map((point: string, index: number) => (
                                                    <div key={`${point}-${index}`} className="flex items-start gap-2 text-sm">
                                                        <ArrowRight className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                                                        <span>{point}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>

                <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
                    <Card className="glass border-primary/20 shadow-xl shadow-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" /> AI Role Copilot
                            </CardTitle>
                            <CardDescription>
                                A visible decision brief for whether to apply now, what to prove, and how to position your story.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Apply Decision</p>
                                <p className="mt-2 text-sm font-semibold leading-6">{copilot.applyDecision}</p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Matched Skills</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {(copilot.matchedSkills || []).length > 0 ? copilot.matchedSkills.map((skill: string) => (
                                            <Badge key={skill} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-none">
                                                {skill}
                                            </Badge>
                                        )) : (
                                            <span className="text-sm text-muted-foreground">No direct overlap detected yet.</span>
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Missing Skills</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {(copilot.missingSkills || []).length > 0 ? copilot.missingSkills.map((skill: string) => (
                                            <Badge key={skill} variant="outline">{skill}</Badge>
                                        )) : (
                                            <span className="text-sm text-muted-foreground">No major visible skill gaps.</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Action Plan</p>
                                <div className="mt-3 space-y-3">
                                    {(copilot.actionPlan || []).map((item: any, index: number) => (
                                        <div key={`${item.title}-${index}`} className="rounded-xl border border-border/50 bg-background/70 p-3">
                                            <p className="text-sm font-bold tracking-tight">{item.title}</p>
                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Interview Signals</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {(copilot.interviewSignals || []).map((signal: string) => (
                                        <Badge key={signal} variant="outline" className="text-[10px]">
                                            <Target className="mr-1 h-3 w-3" /> {signal}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {!isVerified ? (
                                <div className="rounded-2xl border border-orange-200/60 bg-orange-50/20 p-4 text-sm text-muted-foreground">
                                    Your college still needs to verify your student profile before you can submit an application.
                                </div>
                            ) : null}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button className="w-full" variant="outline" onClick={generatePitch} disabled={isPitching}>
                                {isPitching ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                Generate AI Pitch
                            </Button>
                            <Button className="w-full" onClick={handleApply} disabled={isApplying || !isVerified || alreadyApplied}>
                                {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {alreadyApplied ? 'Already Applied' : 'Apply With Copilot'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
