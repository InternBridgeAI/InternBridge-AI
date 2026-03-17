'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Briefcase, Eye, Search, Filter, Building2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export default function AdminInternshipsPage() {
    const [internships, setInternships] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchInternships();
    }, []);

    const fetchInternships = async () => {
        try {
            const result = await apiFetch('/api/internships?status=pending');
            if (result.success) {
                setInternships(result.data);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to load internships');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: string, approve: boolean) => {
        try {
            await apiFetch(`/api/internships/${id}/approve`, {
                method: 'POST',
                body: JSON.stringify({ is_approved: approve }),
            });
            toast.success(approve ? 'Internship approved' : 'Internship rejected');
            setInternships(internships.filter(i => i.id !== id));
        } catch (error: any) {
            toast.error(error.message || 'Operation failed');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold">Listing Approvals</h1>
                <p className="text-muted-foreground mt-2">Approve or reject internship postings before they go live for students.</p>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />)}
                </div>
            ) : internships.length > 0 ? (
                <div className="space-y-4">
                    {internships.map((internship) => (
                        <Card key={internship.id} className="glass overflow-hidden hover:border-primary/20 transition-all">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex gap-4">
                                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                                            <Briefcase className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-bold">{internship.title}</h3>
                                            <div className="flex items-center gap-2 text-primary font-medium text-sm">
                                                <Building2 className="h-3.5 w-3.5" /> {internship.company?.company_name}
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{internship.description}</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {internship.required_skills?.map((s: string) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button variant="outline" className="text-red-500 hover:text-red-600" onClick={() => handleApprove(internship.id, false)}>Reject</Button>
                                        <Button className="bg-primary text-white" onClick={() => handleApprove(internship.id, true)}>Approve Live</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                    <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-bold">Queue is empty</h3>
                    <p className="text-muted-foreground">All pending internships have been reviewed.</p>
                </div>
            )}

            <div className="p-6 rounded-2xl bg-muted/30 border border-border/50">
                <h4 className="font-bold flex items-center gap-2 mb-2"><Clock className="h-4 w-4" /> Approval Policy</h4>
                <p className="text-xs text-muted-foreground">
                    Standard review time is 2-4 hours. Ensure descriptions are clear, stipend (if any) is correctly stated, and role types are accurate.
                    Reject listings with generic titles or missing contact info.
                </p>
            </div>
        </div>
    );
}
