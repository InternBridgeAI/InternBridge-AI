'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Filter, Brain, Sparkles, CheckCircle, Github, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

function CandidatesContent() {
    const searchParams = useSearchParams();
    const internshipId = searchParams.get('internship_id');
    const [candidates, setCandidates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [interviewData, setInterviewData] = useState({ date: '', time: '', link: '' });

    useEffect(() => {
        fetchCandidates();
    }, [internshipId]);

    const fetchCandidates = async () => {
        setIsLoading(true);
        try {
            const url = internshipId
                ? `/api/applications?internship_id=${internshipId}`
                : `/api/applications`;
            const result = await apiFetch(url);
            if (result.success) {
                setCandidates(result.data);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to load candidates');
        } finally {
            setIsLoading(false);
        }
    };

    const updateStatus = async (appId: string, status: string, interviewDetails?: any) => {
        try {
            const body: any = { application_id: appId, status };
            if (interviewDetails) body.interview_details = interviewDetails;

            const result = await apiFetch('/api/applications', {
                method: 'PATCH',
                body: JSON.stringify(body),
            });
            if (result.success) {
                toast.success(`Status updated to ${status}`);
                setCandidates(candidates.map(c => c.id === appId ? { ...c, status, interview_details: interviewDetails } : c));
                setIsInterviewModalOpen(false);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to update status');
        }
    };

    const handleScheduleInterview = () => {
        if (!interviewData.date || !interviewData.time || !interviewData.link) {
            toast.error('Please fill all interview details');
            return;
        }
        updateStatus(selectedApp.id, 'interview', interviewData);
    };

    const filteredCandidates = candidates.filter(c =>
        (c.student?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.internship?.title || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Candidate Discovery</h1>
                    <p className="text-muted-foreground mt-2">AI-ranked applicants sorted by skill vector similarity.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search candidates..."
                            className="pl-10 glass w-64"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />)}
                </div>
            ) : filteredCandidates.length > 0 ? (
                <div className="space-y-4">
                    {filteredCandidates.map((app) => (
                        <Card key={app.id} className="glass hover:border-primary/40 transition-all overflow-hidden border-l-4 border-l-primary/20">
                            <CardContent className="p-6">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                                    {/* Identity */}
                                    <div className="flex items-center gap-4 w-full lg:w-1/4">
                                        <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary text-xl font-bold shrink-0 overflow-hidden">
                                            {app.student?.avatar_url ? (
                                                <img src={app.student.avatar_url} className="h-full w-full object-cover" />
                                            ) : app.student?.full_name?.[0]}
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <h3 className="font-bold truncate">{app.student?.full_name}</h3>
                                            <p className="text-xs text-muted-foreground truncate">{app.student?.email}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {app.student?.github_username && (
                                                    <Badge variant="outline" className="text-[10px] py-0 h-4 bg-muted/50 flex gap-1">
                                                        <Github className="h-2 w-2" /> Verified
                                                    </Badge>
                                                )}
                                                <Badge className="text-[10px] py-0 h-4" variant="secondary">CGPA: {app.student?.cgpa || 'N/A'}</Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Role Applied & Match Score */}
                                    <div className="flex flex-col justify-center gap-2 w-full lg:w-1/4">
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Applied Position</p>
                                        <h4 className="font-semibold text-primary">{app.internship?.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-primary" style={{ width: `${app.match_score * 100}%` }} />
                                            </div>
                                            <span className="text-xs font-bold font-mono">{(app.match_score * 100).toFixed(1)}% Match</span>
                                        </div>
                                    </div>

                                    {/* Skills Cloud */}
                                    <div className="flex flex-wrap gap-1.5 w-full lg:w-1/3">
                                        {app.student?.skills?.slice(0, 5).map((skill: string) => (
                                            <Badge key={skill} variant="outline" className="text-[10px] bg-white/50 dark:bg-black/20">{skill}</Badge>
                                        ))}
                                        {app.student?.skills?.length > 5 && (
                                            <span className="text-[10px] text-muted-foreground self-center">+{app.student.skills.length - 5} more</span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 lg:ml-auto">
                                        {app.status === 'pending' || app.status === 'shortlisted' ? (
                                            <>
                                                {app.status === 'pending' && (
                                                    <Button size="sm" variant="outline" className="text-primary hover:bg-primary/5" onClick={() => updateStatus(app.id, 'shortlisted')}>Shortlist</Button>
                                                )}
                                                <Button size="sm" onClick={() => { setSelectedApp(app); setIsInterviewModalOpen(true); }}>Schedule Interview</Button>
                                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => updateStatus(app.id, 'rejected')}>Reject</Button>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge className="capitalize h-7 px-4 justify-center min-w-[100px]" variant={app.status === 'accepted' ? 'success' : app.status === 'interview' ? 'warning' : 'outline'}>
                                                    {app.status}
                                                </Badge>
                                                {app.status === 'interview' && app.interview_details && (
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">{app.interview_details.date} @ {app.interview_details.time}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {app.cover_letter && (
                                    <div className="mt-4 p-3 rounded bg-muted/30 border border-border/50">
                                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Cover Letter Snippet</p>
                                        <p className="text-sm italic line-clamp-1">"{app.cover_letter}"</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="glass border-dashed border-2 py-20 text-center">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-bold">No candidates found</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-2">Adjust your filters or wait for our AI to find new matches for your postings.</p>
                </Card>
            )}

            {/* Custom Interview Modal */}
            {isInterviewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <Card className="w-full max-w-md glass shadow-2xl border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" /> Schedule Interview
                            </CardTitle>
                            <CardDescription>Invite {selectedApp?.student?.full_name} for a technical round.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Date</label>
                                    <Input type="date" className="glass" value={interviewData.date} onChange={e => setInterviewData({ ...interviewData, date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Time</label>
                                    <Input type="time" className="glass" value={interviewData.time} onChange={e => setInterviewData({ ...interviewData, time: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Meeting Link</label>
                                <Input placeholder="Google Meet / Zoom link" className="glass" value={interviewData.link} onChange={e => setInterviewData({ ...interviewData, link: e.target.value })} />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-3 pt-2">
                            <Button variant="ghost" className="font-bold text-xs uppercase transition-all" onClick={() => setIsInterviewModalOpen(false)}>Cancel</Button>
                            <Button className="font-black text-xs uppercase tracking-widest px-6 shadow-lg shadow-primary/20" onClick={handleScheduleInterview}>Send Invitation</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}

export default function CandidatesPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center animate-pulse text-muted-foreground">Loading candidates...</div>}>
            <CandidatesContent />
        </Suspense>
    );
}
