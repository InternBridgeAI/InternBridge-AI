'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Briefcase, Clock, DollarSign, Brain, Sparkles, Loader2, ShieldCheck, Target, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { buildMatchInsight } from '@/lib/ai-match';
import { cn } from '@/lib/utils';

function toneClasses(tone: 'strong' | 'good' | 'stretch' | 'early') {
    if (tone === 'strong') {
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
    }
    if (tone === 'good') {
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
    }
    if (tone === 'stretch') {
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
    }
    return 'bg-muted text-muted-foreground border-border';
}

export default function InternshipsPage() {
    const [internships, setInternships] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [matchingId, setMatchingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [studentVerificationStatus, setStudentVerificationStatus] = useState<string | null>(null);
    const [studentCollegeId, setStudentCollegeId] = useState<string | null>(null);
    const [studentCollegeName, setStudentCollegeName] = useState<string | null>(null);
    const [studentSkills, setStudentSkills] = useState<string[]>([]);
    const [readinessScore, setReadinessScore] = useState<number | null>(null);
    const [pitchingId, setPitchingId] = useState<string | null>(null);
    const [pitchPreview, setPitchPreview] = useState<any | null>(null);
    const [pitchInternship, setPitchInternship] = useState<any | null>(null);

    useEffect(() => {
        const load = async () => {
            await fetchProfile();
            await fetchInternships();
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchProfile = async () => {
        try {
            const result = await apiFetch('/api/auth/profile');
            if (result.success) {
                const profile = result.data || {};
                setStudentVerificationStatus(profile.student_verification_status || null);
                setStudentCollegeId(profile.college_id || null);
                setStudentCollegeName(profile.college_name || profile.university || null);
                setStudentSkills(Array.isArray(profile.skills) ? profile.skills : []);
                setReadinessScore(typeof profile.market_readiness_score === 'number' ? profile.market_readiness_score : null);
            }
        } catch (error: any) {
            console.error(error);
        }
    };

    const fetchInternships = async () => {
        try {
            const result = await apiFetch('/api/internships?status=active');
            if (result.success) {
                setInternships(result.data);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to load internships');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = async (internship: any, coverLetter?: string) => {
        setMatchingId(internship.id);
        const fallbackPitch = coverLetter || [
            `I’m applying for ${internship.title} because my background aligns with ${internship.insight.matchedSkills.length > 0 ? internship.insight.matchedSkills.slice(0, 2).join(' and ') : 'the role requirements'}.`,
            internship.insight.missingSkills[0]
                ? `I’m actively improving ${internship.insight.missingSkills[0]} to close the remaining gap fast.`
                : 'I can contribute quickly and deepen my impact from day one.',
        ].join(' ');
        try {
            const result = await apiFetch('/api/applications', {
                method: 'POST',
                body: JSON.stringify({ internship_id: internship.id, cover_letter: fallbackPitch }),
            });
            if (result.success) {
                toast.success('Application submitted! AI Match Score: ' + (result.data.match_score * 100).toFixed(1) + '%');
                setPitchPreview(null);
                setPitchInternship(null);
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred');
        } finally {
            setMatchingId(null);
        }
    };

    const generatePitch = async (internship: any) => {
        setPitchInternship(internship);
        setPitchPreview(null);
        setPitchingId(internship.id);
        try {
            const result = await apiFetch('/api/ai/application-pitch', {
                method: 'POST',
                body: JSON.stringify({ internship_id: internship.id }),
            });
            if (result.success) {
                setPitchPreview(result.data);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to generate AI pitch');
        } finally {
            setPitchingId(null);
        }
    };

    const filteredInternships = useMemo(() => {
        return internships
            .filter((internship) =>
                (internship.title || '').toLowerCase().includes(search.toLowerCase()) ||
                (internship.company?.company_name || '').toLowerCase().includes(search.toLowerCase()),
            )
            .map((internship) => ({
                ...internship,
                insight: buildMatchInsight(internship.required_skills || [], studentSkills),
            }))
            .sort((a, b) => b.insight.score - a.insight.score);
    }, [internships, search, studentSkills]);

    const discoverySummary = useMemo(() => {
        const strongMatches = filteredInternships.filter((item) => item.insight.score >= 82).length;
        const goodMatches = filteredInternships.filter((item) => item.insight.score >= 60).length;
        const gapCounter = new Map<string, number>();

        filteredInternships.forEach((item) => {
            item.insight.missingSkills.forEach((skill: string) => {
                gapCounter.set(skill, (gapCounter.get(skill) || 0) + 1);
            });
        });

        const topGap = Array.from(gapCounter.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        return {
            strongMatches,
            goodMatches,
            topGap,
        };
    }, [filteredInternships]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Recommended Internships</h1>
                    <p className="text-muted-foreground mt-2">AI-ranked opportunities with transparent fit explanations.</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search roles or companies..."
                        className="pl-10 glass"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {!isLoading && (
                <Card className="glass overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-background to-blue-500/[0.08] shadow-xl shadow-primary/5">
                    <CardContent className="p-6 md:p-7">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-2xl space-y-4">
                                <Badge className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-[0.2em] text-[10px] px-3 py-1">
                                    <Sparkles className="mr-1.5 h-3 w-3" /> AI Discovery Mode
                                </Badge>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black tracking-tight">Your best-fit roles are now sorted by real overlap.</h2>
                                    <p className="text-sm text-muted-foreground leading-6">
                                        {discoverySummary.topGap
                                            ? `You already have ${discoverySummary.strongMatches} strong-fit and ${discoverySummary.goodMatches} good-fit roles in view. Closing ${discoverySummary.topGap} would widen your shortlist quickly.`
                                            : `You already have ${discoverySummary.strongMatches} strong-fit and ${discoverySummary.goodMatches} good-fit roles in view. The current stack is well aligned with your profile.`}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {studentSkills.slice(0, 4).map((skill) => (
                                        <Badge key={skill} variant="outline" className="border-primary/20 bg-background/70 text-[11px] font-semibold">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
                                <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Strong Fit</p>
                                    <p className="mt-2 text-3xl font-black tracking-tight text-primary">{discoverySummary.strongMatches}</p>
                                    <p className="text-xs text-muted-foreground mt-1">ready-to-apply roles</p>
                                </div>
                                <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Readiness</p>
                                    <p className="mt-2 text-3xl font-black tracking-tight">{readinessScore ? `${Math.round(readinessScore)}%` : 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground mt-1">current market signal</p>
                                </div>
                                <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Verification</p>
                                    <p className="mt-2 text-3xl font-black tracking-tight">{studentVerificationStatus === 'verified' ? 'Live' : 'Pending'}</p>
                                    <p className="text-xs text-muted-foreground mt-1">application eligibility</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-72 rounded-xl bg-muted/50 animate-pulse" />
                    ))}
                </div>
            ) : filteredInternships.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredInternships.map((internship) => (
                        <Card key={internship.id} className="glass group hover:border-primary/40 transition-all duration-300 hover:shadow-lg overflow-hidden">
                            <CardHeader>
                                <div className="flex justify-between items-start gap-3">
                                    <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                                        {internship.company?.company_name?.[0] || 'C'}
                                    </div>
                                    <Badge className={cn('border flex gap-1.5', toneClasses(internship.insight.fitTone))}>
                                        <Sparkles className="h-3 w-3" /> {internship.insight.fitLabel}
                                    </Badge>
                                </div>
                                <CardTitle className="mt-4 leading-tight">{internship.title}</CardTitle>
                                <CardDescription className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" /> {internship.company?.company_name}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">AI Fit Score</p>
                                        <p className="text-xl font-black tracking-tight text-primary">{internship.insight.score}%</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Coverage</p>
                                        <p className="text-sm font-bold">{Math.round(internship.insight.coverage * 100)}%</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {(internship.required_skills || []).slice(0, 3).map((skill: string) => (
                                        <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                                    ))}
                                    {(internship.required_skills || []).length > 3 && (
                                        <Badge variant="outline" className="text-[10px]">+{internship.required_skills.length - 3}</Badge>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" /> {internship.location || 'Remote'}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> {internship.duration_weeks} weeks
                                    </div>
                                    <div className="flex items-center gap-1 col-span-2">
                                        <DollarSign className="h-3 w-3" /> {internship.is_paid ? `₹${internship.stipend}` : 'Unpaid'}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border/50 bg-muted/20 p-3 space-y-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-1">Why this role fits</p>
                                        <p className="text-sm font-medium">{internship.insight.summary}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {internship.insight.matchedSkills.length > 0 ? internship.insight.matchedSkills.slice(0, 3).map((skill: string) => (
                                            <Badge key={skill} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-none">
                                                <ShieldCheck className="mr-1 h-3 w-3" /> {skill}
                                            </Badge>
                                        )) : (
                                            <p className="text-xs text-muted-foreground">Add more profile signals to strengthen AI confidence on this role.</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-1">Fastest unlock</p>
                                        <p className="text-xs text-muted-foreground leading-5">{internship.insight.gapSummary}</p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/20 border-t border-border/50 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex w-full gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => generatePitch(internship)}
                                        disabled={pitchingId === internship.id}
                                    >
                                        {pitchingId === internship.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                        AI Pitch
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleApply(internship)}
                                        disabled={matchingId === internship.id || studentVerificationStatus !== 'verified'}
                                    >
                                        {matchingId === internship.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : studentVerificationStatus !== 'verified' ? 'Awaiting Verification' : 'Quick Apply'}
                                    </Button>
                                </div>
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                    <Target className="mr-1 h-3 w-3" /> {internship.insight.fitLabel}
                                </Badge>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">No internships found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or complete your profile for better matches.</p>
                </div>
            )}

            {!isLoading && (
                <>
                    {!studentCollegeId ? (
                        <div className="p-4 rounded-xl border border-dashed border-border bg-muted/10 text-sm text-muted-foreground">
                            Select your college in onboarding to see internships available for your batch.
                        </div>
                    ) : studentVerificationStatus && studentVerificationStatus !== 'verified' ? (
                        <div className="p-4 rounded-xl border border-orange-200/60 bg-orange-50/20 dark:bg-orange-900/5 text-sm">
                            <p className="font-semibold text-orange-700 dark:text-orange-400">
                                Pending college verification
                            </p>
                            <p className="text-muted-foreground mt-1">
                                {studentCollegeName ? `${studentCollegeName} ` : 'Your college '}
                                needs to approve your student profile before you can apply.
                            </p>
                        </div>
                    ) : null}
                </>
            )}

            {pitchInternship && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
                    <Card className="glass w-full max-w-3xl border-primary/20 shadow-2xl">
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-primary" /> AI Application Pitch
                                    </CardTitle>
                                    <CardDescription>
                                        Tailored pitch for {pitchInternship.title}. Use this to apply with stronger context than a generic cover letter.
                                    </CardDescription>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => { setPitchInternship(null); setPitchPreview(null); }}>
                                    Close
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {pitchingId === pitchInternship.id && !pitchPreview ? (
                                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground">Generating a tailored pitch from your profile and this internship.</p>
                                </div>
                            ) : pitchPreview ? (
                                <>
                                    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                                        <div className="space-y-4">
                                            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">AI Fit</p>
                                                <p className="mt-2 text-3xl font-black tracking-tight text-primary">{pitchPreview.fitScore || pitchInternship.insight.score}%</p>
                                                <p className="text-xs text-muted-foreground mt-1">{pitchPreview.confidenceLabel || pitchInternship.insight.fitLabel}</p>
                                            </div>
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
                                            {(pitchPreview.missingSkills || []).length > 0 && (
                                                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Watchouts</p>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {pitchPreview.missingSkills.map((skill: string) => (
                                                            <Badge key={skill} variant="outline" className="text-[10px]">
                                                                {skill}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Cover Letter</p>
                                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{pitchPreview.coverLetter}</p>
                                            </div>
                                            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Interview Talking Points</p>
                                                <div className="mt-3 space-y-2">
                                                    {(pitchPreview.talkingPoints || []).map((point: string, index: number) => (
                                                        <div key={`${point}-${index}`} className="flex items-start gap-2 text-sm">
                                                            <ArrowRight className="mt-0.5 h-4 w-4 text-primary" />
                                                            <span>{point}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {studentVerificationStatus !== 'verified' && (
                                        <div className="rounded-2xl border border-orange-200/60 bg-orange-50/20 p-4 text-sm text-muted-foreground">
                                            Your pitch is ready, but your college still needs to verify your profile before you can submit applications.
                                        </div>
                                    )}
                                </>
                            ) : null}
                        </CardContent>
                        <CardFooter className="flex flex-wrap justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => generatePitch(pitchInternship)} disabled={pitchingId === pitchInternship.id}>
                                {pitchingId === pitchInternship.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Regenerate'}
                            </Button>
                            <Button
                                onClick={() => handleApply(pitchInternship, pitchPreview?.coverLetter)}
                                disabled={!pitchPreview || matchingId === pitchInternship.id || studentVerificationStatus !== 'verified'}
                            >
                                {matchingId === pitchInternship.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply With AI Pitch'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}
