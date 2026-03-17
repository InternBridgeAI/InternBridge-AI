'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Building2,
    CheckCircle,
    Clock,
    FileText,
    GraduationCap,
    Briefcase,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export default function TPOApprovalsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [internships, setInternships] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'students' | 'companies' | 'internships'>('students');

    useEffect(() => {
        fetchApprovals();
    }, []);

    const fetchApprovals = async () => {
        try {
            const result = await apiFetch('/api/tpo/approvals');
            if (result.success) {
                const payload = result.data || {};
                const nextStudents = payload.students || [];
                const nextCompanies = payload.companies || [];
                const nextInternships = payload.internships || [];
                setStudents(nextStudents);
                setCompanies(nextCompanies);
                setInternships(nextInternships);

                if (nextStudents.length > 0) setActiveTab('students');
                else if (nextCompanies.length > 0) setActiveTab('companies');
                else setActiveTab('internships');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to load approvals');
        } finally {
            setIsLoading(false);
        }
    };

    const verifyStudent = async (studentId: string, action: 'verify' | 'reject') => {
        try {
            await apiFetch(`/api/tpo/students/${studentId}/verify`, {
                method: 'POST',
                body: JSON.stringify({ action, notes: `TPO review: ${action}` }),
            });
            toast.success(action === 'verify' ? 'Student verified' : 'Student rejected');
            setStudents((prev) => prev.filter((s) => s.id !== studentId));
        } catch (error: any) {
            toast.error(error.message || 'Operation failed');
        }
    };

    const decideCompanyRequest = async (requestId: string, action: 'approve' | 'reject') => {
        try {
            await apiFetch(`/api/tpo/company-requests/${requestId}`, {
                method: 'POST',
                body: JSON.stringify({ action, notes: `TPO review: ${action}` }),
            });
            toast.success(action === 'approve' ? 'Company approved' : 'Company rejected');
            setCompanies((prev) => prev.filter((r) => r.id !== requestId));
        } catch (error: any) {
            toast.error(error.message || 'Operation failed');
        }
    };

    const decideInternship = async (internshipId: string, approve: boolean) => {
        try {
            await apiFetch(`/api/internships/${internshipId}/approve`, {
                method: 'POST',
                body: JSON.stringify({ is_approved: approve }),
            });
            toast.success(approve ? 'Internship approved' : 'Internship rejected');
            setInternships((prev) => prev.filter((i) => i.id !== internshipId));
        } catch (error: any) {
            toast.error(error.message || 'Operation failed');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Approvals & Verification</h1>
                    <p className="text-muted-foreground mt-2">Verify students and companies, and approve internships for your college ecosystem.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                        {students.length} Students
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                        {companies.length} Companies
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                        {internships.length} Internships
                    </Badge>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    variant={activeTab === 'students' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('students')}
                >
                    <GraduationCap className="h-4 w-4 mr-2" /> Student Verification
                </Button>
                <Button
                    variant={activeTab === 'companies' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('companies')}
                >
                    <ShieldCheck className="h-4 w-4 mr-2" /> Company Requests
                </Button>
                <Button
                    variant={activeTab === 'internships' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('internships')}
                >
                    <Briefcase className="h-4 w-4 mr-2" /> Internship Approvals
                </Button>
            </div>

            <div className="grid gap-6">
                {isLoading ? (
                    [1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />)
                ) : activeTab === 'students' ? (
                    students.length > 0 ? (
                        students.map((student) => (
                            <Card key={student.id} className="glass hover:border-primary/20 transition-all">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="font-bold">{student.full_name || 'Student'}</p>
                                            <p className="text-xs text-muted-foreground">{student.email}</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <Badge variant="warning" className="text-[10px]">Pending</Badge>
                                                {student.college_email ? (
                                                    <Badge variant="secondary" className="text-[10px]">{student.college_email}</Badge>
                                                ) : null}
                                                {student.student_id_url ? (
                                                    <a
                                                        href={student.student_id_url}
                                                        target="_blank"
                                                        className="text-[10px] font-semibold text-primary underline inline-flex items-center gap-1"
                                                    >
                                                        <FileText className="h-3 w-3" /> Student ID
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                className="text-red-500 hover:text-red-600"
                                                onClick={() => verifyStudent(student.id, 'reject')}
                                            >
                                                Reject
                                            </Button>
                                            <Button
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => verifyStudent(student.id, 'verify')}
                                            >
                                                Verify Student
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                            <h3 className="text-xl font-bold">No pending students</h3>
                            <p className="text-muted-foreground">All student profiles are verified.</p>
                        </div>
                    )
                ) : activeTab === 'companies' ? (
                    companies.length > 0 ? (
                        companies.map((req) => (
                            <Card key={req.id} className="glass hover:border-primary/20 transition-all">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="font-bold">{req.company?.company_name || req.company?.full_name || 'Company'}</p>
                                            <p className="text-xs text-muted-foreground">{req.company?.email}</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <Badge variant="warning" className="text-[10px]">Pending</Badge>
                                                {req.company?.company_industry ? (
                                                    <Badge variant="secondary" className="text-[10px]">{req.company.company_industry}</Badge>
                                                ) : null}
                                                {req.company?.company_document_url ? (
                                                    <a
                                                        href={req.company.company_document_url}
                                                        target="_blank"
                                                        className="text-[10px] font-semibold text-primary underline inline-flex items-center gap-1"
                                                    >
                                                        <FileText className="h-3 w-3" /> Document
                                                    </a>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                className="text-red-500 hover:text-red-600"
                                                onClick={() => decideCompanyRequest(req.id, 'reject')}
                                            >
                                                Reject
                                            </Button>
                                            <Button
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => decideCompanyRequest(req.id, 'approve')}
                                            >
                                                Approve Company
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                            <h3 className="text-xl font-bold">No pending company requests</h3>
                            <p className="text-muted-foreground">Your partner queue is clear.</p>
                        </div>
                    )
                ) : internships.length > 0 ? (
                    internships.map((internship) => (
                        <Card key={internship.id} className="glass hover:border-primary/20 transition-all group">
                            <CardContent className="p-6">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                                    <div className="flex items-center gap-4 lg:w-1/4">
                                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                            <Building2 className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold truncate">{internship.title}</h3>
                                            <p className="text-xs text-primary font-medium">{internship.company?.company_name}</p>
                                        </div>
                                    </div>

                                    <div className="flex-grow flex flex-col justify-center">
                                        <p className="text-xs text-muted-foreground line-clamp-2">{internship.description}</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {internship.required_skills?.slice(0, 3).map((s: string) => (
                                                <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 shrink-0 lg:ml-auto">
                                        <div className="text-right">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Stipend</p>
                                            <p className="text-sm font-black">{internship.is_paid ? `₹${internship.stipend}/mo` : 'Unpaid'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                className="text-red-500 border-red-200"
                                                onClick={() => decideInternship(internship.id, false)}
                                            >
                                                Reject
                                            </Button>
                                            <Button
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => decideInternship(internship.id, true)}
                                            >
                                                Approve
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                        <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-bold">No pending internships</h3>
                        <p className="text-muted-foreground">No postings waiting for your approval.</p>
                    </div>
                )}
            </div>

            <Card className="glass border-dashed overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-muted-foreground text-xs italic">
                    <p className="flex items-center gap-2"><Clock className="h-3 w-3" /> Policy: approvals reflect on student dashboards within a few minutes.</p>
                    <p>Tip: verify students using college email + student ID to prevent fraud.</p>
                </div>
            </Card>
        </div>
    );
}
