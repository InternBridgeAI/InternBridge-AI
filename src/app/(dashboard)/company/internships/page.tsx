'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Users, Eye, Pencil, Trash2, Calendar, MapPin, Briefcase, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export default function MyInternshipsPage() {
    const [internships, setInternships] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchMyInternships();
    }, []);

    const fetchMyInternships = async () => {
        try {
            const result = await apiFetch('/api/internships?my_internships=true');
            if (result.success) {
                setInternships(result.data);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to load internships');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">My Internships</h1>
                    <p className="text-muted-foreground mt-2">Manage your active postings and track applicant performance.</p>
                </div>
                <Link href="/company/internships/new" className={buttonVariants({ className: 'shadow-lg' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Post New Role
                </Link>
            </div>

            {isLoading ? (
                <div className="grid gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-muted/50 animate-pulse" />)}
                </div>
            ) : internships.length > 0 ? (
                <div className="space-y-6">
                    {internships.map((internship) => (
                        <Card key={internship.id} className="glass hover:border-primary/30 transition-all group overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                <div className="p-6 flex-grow space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{internship.title}</h3>
                                            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {internship.location || 'Remote'}</span>
                                                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Posted {new Date(internship.created_at).toLocaleDateString()}</span>
                                                <Badge variant={internship.is_approved ? 'success' : 'warning'}>
                                                    {internship.is_approved ? 'Live' : 'Pending Approval'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {internship.required_skills?.map((skill: string) => (
                                            <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-muted/30 border-t md:border-t-0 md:border-l border-border/50 p-6 md:w-72 flex flex-col justify-center space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Applied</span>
                                        <span className="text-xl font-bold">{internship.applicant_count || 0}</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: '60%' }} />
                                    </div>
                                    <div className="space-y-2">
                                        <Link href={`/company/candidates?internship_id=${internship.id}`} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-full' })}>
                                            <Users className="mr-2 h-4 w-4" /> View Applicants
                                        </Link>
                                        <Link href={`/company/internships/${internship.id}/recommendations`} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-full border-primary/20 hover:bg-primary/5 text-primary font-bold uppercase tracking-widest text-[10px]' })}>
                                            <Sparkles className="mr-2 h-3.5 w-3.5" /> AI Recommendations
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="glass border-dashed border-2 py-20">
                    <CardContent className="flex flex-col items-center text-center">
                        <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-bold">No internships posted</h3>
                        <p className="text-muted-foreground max-w-sm mt-2">Create your first internship listing to start receiving AI-matched applications.</p>
                        <Link href="/company/internships/new" className={buttonVariants({ className: 'mt-8' })}>Create Listing Now</Link>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
