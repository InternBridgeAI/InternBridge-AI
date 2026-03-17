'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Briefcase, Clock, DollarSign, Brain, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export default function InternshipsPage() {
    const [internships, setInternships] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [matchingId, setMatchingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [studentVerificationStatus, setStudentVerificationStatus] = useState<string | null>(null);
    const [studentCollegeId, setStudentCollegeId] = useState<string | null>(null);
    const [studentCollegeName, setStudentCollegeName] = useState<string | null>(null);

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
            }
        } catch (error: any) {
            // Profile fetch failure shouldn't block internships browse.
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

    const handleApply = async (id: string) => {
        setMatchingId(id);
        try {
            const result = await apiFetch('/api/applications', {
                method: 'POST',
                body: JSON.stringify({ internship_id: id, cover_letter: 'Self-motivated candidate with matching skills.' }),
            });
            if (result.success) {
                toast.success('Application submitted! AI Match Score: ' + (result.data.match_score * 100).toFixed(1) + '%');
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred');
        } finally {
            setMatchingId(null);
        }
    };

    const filteredInternships = internships.filter(i =>
        (i.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.company?.company_name || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Recommended Internships</h1>
                    <p className="text-muted-foreground mt-2">AI-matched opportunities based on your skill vector.</p>
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

            {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-64 rounded-xl bg-muted/50 animate-pulse" />
                    ))}
                </div>
            ) : filteredInternships.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredInternships.map((internship) => (
                        <Card key={internship.id} className="glass group hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {internship.company?.company_name?.[0] || 'C'}
                                    </div>
                                    <Badge className="bg-primary/10 text-primary border-primary/20 flex gap-1">
                                        <Sparkles className="h-3 w-3" /> AI Rank: High
                                    </Badge>
                                </div>
                                <CardTitle className="mt-4">{internship.title}</CardTitle>
                                <CardDescription className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" /> {internship.company?.company_name}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {internship.required_skills?.slice(0, 3).map((skill: string) => (
                                        <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                                    ))}
                                    {internship.required_skills?.length > 3 && (
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
                                    <div className="flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" /> {internship.is_paid ? `₹${internship.stipend}` : 'Unpaid'}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/30 border-t border-border/50 py-3 flex justify-between">
                                <Button
                                    size="sm"
                                    onClick={() => handleApply(internship.id)}
                                    disabled={matchingId === internship.id || studentVerificationStatus !== 'verified'}
                                >
                                    {matchingId === internship.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : studentVerificationStatus !== 'verified' ? 'Awaiting Verification' : 'Apply Now'}
                                </Button>
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
        </div>
    );
}
