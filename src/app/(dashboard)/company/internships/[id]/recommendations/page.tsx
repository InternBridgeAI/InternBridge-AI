'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Users, Mail, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

export default function RecommendationsPage() {
    const { id } = useParams();
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchRecommendations();
    }, [id]);

    const fetchRecommendations = async () => {
        try {
            const result = await apiFetch(`/api/ai/recommend-candidates/${id}`);
            if (result.success) {
                setRecommendations(result.data || []);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch recommendations');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/company/internships">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-primary" /> AI Candidate Recommendations
                    </h1>
                    <p className="text-muted-foreground mt-1">Top talent matched by skill similarity vectors and TF-IDF weightage.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <p className="text-sm font-bold uppercase tracking-widest animate-pulse text-primary/60">Running Global Talent Matcher...</p>
                </div>
            ) : recommendations.length > 0 ? (
                <div className="grid gap-6">
                    {recommendations.map((candidate) => (
                        <Card key={candidate.id} className="glass group hover:border-primary/50 transition-all overflow-hidden shadow-xl shadow-primary/5">
                            <div className="flex flex-col md:flex-row p-6 items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-black shadow-inner border border-primary/20 overflow-hidden shrink-0">
                                        {candidate.avatar_url ? (
                                            <img src={candidate.avatar_url} alt={candidate.full_name} className="h-full w-full object-cover" />
                                        ) : (
                                            candidate.full_name?.[0]
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-extrabold tracking-tight underline decoration-primary/30 decoration-2 underline-offset-4">{candidate.full_name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Mail className="h-3 w-3 opacity-50" />
                                            <span className="text-xs text-muted-foreground">{candidate.email}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {candidate.skills?.map((skill: string) => (
                                                <Badge key={skill} variant="secondary" className="text-[10px] font-bold uppercase tracking-tighter bg-primary/5 text-primary border-none px-2 py-0.5">{skill}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center md:items-end gap-3 min-w-[150px] w-full md:w-auto">
                                    <div className="text-center md:text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Match Accuracy</p>
                                        <p className="text-4xl font-black italic tracking-tighter text-primary">{Math.round(candidate.score)}%</p>
                                    </div>
                                    <Button className="w-full font-black uppercase text-[10px] tracking-widest h-10 rounded-xl shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
                                        Send Invitation
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="glass py-20 border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center text-center">
                        <Users className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                        <h3 className="text-lg font-bold">No High-Match Candidates Found</h3>
                        <p className="text-sm text-muted-foreground mt-2 max-w-sm">Try broadening your required skills to attract a wider range of talent or check back in later as more students join the ecosystem.</p>
                        <Button variant="outline" className="mt-8 font-bold text-xs uppercase tracking-widest" asChild>
                            <Link href="/company/internships">Back to Listings</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
