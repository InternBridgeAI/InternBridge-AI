'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Award, Search, CheckCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export default function CertificatesPage() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [search, setSearch] = useState('');
    const [applications, setApplications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [issuingId, setIssuingId] = useState<string | null>(null);
    const [issuedApplicationIds, setIssuedApplicationIds] = useState<string[]>([]);

    useEffect(() => {
        const fetchApplications = async () => {
            setIsLoading(true);
            try {
                const result = await apiFetch('/api/applications');
                if (result.success) {
                    setApplications(result.data || []);
                }
            } catch (error: any) {
                toast.error(error.message || 'Failed to load applications');
            } finally {
                setIsLoading(false);
            }
        };

        fetchApplications();
    }, []);

    const handleGenerate = async (application: any) => {
        setIssuingId(application.id);
        setIsGenerating(true);
        try {
            const title = `${application.internship?.title || 'Internship'} Completion`;
            const description = application.internship?.title
                ? `Awarded for successful completion of the ${application.internship.title} internship.`
                : 'Awarded for successful internship completion.';

            await apiFetch('/api/certificates', {
                method: 'POST',
                body: JSON.stringify({
                    student_id: application.student_id,
                    internship_id: application.internship_id,
                    title,
                    description,
                }),
            });

            toast.success('Certificate issued to student profile!');
            setIssuedApplicationIds((prev) => Array.from(new Set([...prev, application.id])));
        } catch (error: any) {
            toast.error(error.message || 'Failed to issue certificate');
        } finally {
            setIsGenerating(false);
            setIssuingId(null);
        }
    };

    const acceptedApps = applications.filter((app) => app.status === 'accepted');
    const filtered = acceptedApps.filter((app) => {
        const studentName = app.student?.full_name || '';
        const internshipTitle = app.internship?.title || '';
        return (
            studentName.toLowerCase().includes(search.toLowerCase()) ||
            internshipTitle.toLowerCase().includes(search.toLowerCase())
        );
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Digital Certificates</h1>
                    <p className="text-muted-foreground mt-2">Issue verified performance certificates to successful interns.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search completed interns..."
                        className="pl-10 glass w-64"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    [1, 2, 3].map((i) => (
                        <Card key={i} className="glass">
                            <CardHeader>
                                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                                <div className="h-4 w-24 bg-muted animate-pulse mt-4" />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="h-16 bg-muted animate-pulse rounded-lg" />
                            </CardContent>
                        </Card>
                    ))
                ) : filtered.length > 0 ? (
                    filtered.map((app) => {
                        const studentName = app.student?.full_name || 'Student';
                        const initials = studentName
                            .split(' ')
                            .map((s: string) => s[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase();
                        const issued = issuedApplicationIds.includes(app.id);
                        const acceptedDate = app.created_at
                            ? new Date(app.created_at).toLocaleDateString()
                            : 'Unknown date';
                        return (
                            <Card key={app.id} className="glass border-primary/20 bg-primary/5">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {initials || 'ST'}
                                        </div>
                                        <Badge variant="success">Accepted</Badge>
                                    </div>
                                    <CardTitle className="mt-4">{studentName}</CardTitle>
                                    <CardDescription>{app.internship?.title || 'Internship'}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-3 rounded-lg bg-white/50 dark:bg-black/40 border border-primary/10 text-xs">
                                        <p className="font-bold flex items-center gap-1.5">
                                            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Accepted Offer
                                        </p>
                                        <p className="mt-1 text-muted-foreground">Accepted: {acceptedDate}</p>
                                        {app.internship?.stipend ? (
                                            <p className="text-muted-foreground">Stipend: ₹{app.internship.stipend}</p>
                                        ) : (
                                            <p className="text-muted-foreground">Stipend: Not specified</p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {(app.student?.skills || []).slice(0, 4).map((skill: string) => (
                                            <Badge key={skill} variant="outline" className="text-[8px]">{skill}</Badge>
                                        ))}
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-muted/30 border-t border-border/50 py-3">
                                    <Button
                                        className="w-full"
                                        size="sm"
                                        onClick={() => handleGenerate(app)}
                                        disabled={isGenerating || issuingId === app.id || issued}
                                    >
                                        {issuingId === app.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <><Award className="h-4 w-4 mr-2" /> {issued ? 'Issued' : 'Issue Certificate'}</>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })
                ) : (
                    <div className="md:col-span-2 lg:col-span-3 text-center py-16 rounded-xl border border-dashed border-border bg-muted/20">
                        <p className="text-sm font-semibold text-muted-foreground">No accepted interns yet.</p>
                        <p className="text-xs text-muted-foreground mt-1">Certificates are available once an application is accepted.</p>
                    </div>
                )}
            </div>

            <Card className="glass bg-gradient-to-br from-indigo-500/5 to-transparent border-indigo-500/20">
                <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="md:w-2/3 space-y-4">
                        <h3 className="text-2xl font-bold flex items-center gap-3">
                            <ShieldCheck className="h-8 w-8 text-indigo-500" /> Public Verification Record
                        </h3>
                        <p className="text-muted-foreground">
                            Every certificate gets a unique digital fingerprint and a public verification URL.
                            Recruiters and colleges can confirm the issued record directly against InternBridge without asking students for extra proof.
                        </p>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>One-Click Issuing</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Public Verify URL</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Integrity Checked</span>
                            </div>
                        </div>
                    </div>
                    <div className="md:w-1/3 flex justify-center">
                        <div className="relative h-48 w-64 bg-white dark:bg-slate-900 rounded-lg shadow-2xl border-2 border-slate-200 dark:border-slate-800 p-4 rotate-3 group-hover:rotate-0 transition-transform">
                            <div className="absolute top-2 left-2 border border-slate-200 p-0.5"><Award className="h-8 w-8 text-indigo-500" /></div>
                            <div className="mt-10 space-y-2">
                                <div className="h-2 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                                <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded" />
                            </div>
                            <div className="mt-8 flex justify-between items-end">
                                <div className="h-8 w-16 bg-slate-50 dark:bg-slate-800 rounded" />
                                <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
