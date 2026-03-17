'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Briefcase, Clock, Loader2, Plus, ShieldCheck, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';

type PartnershipStatus = 'none' | 'loading' | 'pending' | 'approved' | 'rejected';

export default function NewInternshipPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [skills, setSkills] = useState<string[]>([]);
    const [colleges, setColleges] = useState<{ value: string; label: string }[]>([]);
    const [partnershipStatus, setPartnershipStatus] = useState<PartnershipStatus>('none');
    const [isRequesting, setIsRequesting] = useState(false);
    const [formData, setFormData] = useState({
        college_id: '',
        title: '',
        description: '',
        type: 'remote',
        is_paid: false,
        stipend: '',
        duration_weeks: '4',
        location: '',
        max_applicants: '50',
        deadline: '',
    });
    const [isSuggesting, setIsSuggesting] = useState(false);

    useEffect(() => {
        const loadColleges = async () => {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, full_name, college_name')
                    .in('role', ['tpo', 'college', 'college_tpo']);
                if (error) throw error;

                const options = (data || [])
                    .map((row: any) => ({
                        value: row.id,
                        label: row.college_name || row.full_name || 'College',
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label));
                setColleges(options);
            } catch (e) {
                console.error(e);
                toast.error('Failed to load colleges');
            }
        };

        loadColleges();
    }, []);

    useEffect(() => {
        const checkStatus = async () => {
            if (!formData.college_id) {
                setPartnershipStatus('none');
                return;
            }

            setPartnershipStatus('loading');
            try {
                const result = await apiFetch(
                    `/api/partnerships/status?college_id=${encodeURIComponent(formData.college_id)}`
                );
                const status = result?.data?.status as PartnershipStatus | undefined;
                setPartnershipStatus(status || 'none');
            } catch (e: any) {
                console.error(e);
                setPartnershipStatus('none');
            }
        };

        checkStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.college_id]);

    const handleAddSkill = (e: any) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            e.preventDefault();
            const skill = e.target.value.trim();
            if (!skills.includes(skill)) {
                setSkills([...skills, skill]);
            }
            e.target.value = '';
        }
    };

    const removeSkill = (skill: string) => {
        setSkills(skills.filter(s => s !== skill));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.college_id) {
            toast.error('Select a target college first');
            return;
        }
        if (partnershipStatus !== 'approved') {
            toast.error('Your company must be approved by the selected college before posting.');
            return;
        }
        if (skills.length === 0) {
            toast.error('Add at least one required skill');
            return;
        }

        setIsLoading(true);
        try {
            const result = await apiFetch('/api/internships', {
                method: 'POST',
                body: JSON.stringify({
                    ...formData,
                    required_skills: skills,
                    stipend: formData.is_paid ? Number(formData.stipend) : null,
                    duration_weeks: Number(formData.duration_weeks),
                    max_applicants: Number(formData.max_applicants),
                }),
            });

            if (result.success) {
                toast.success('Internship posted successfully! AI skill vector generated.');
                router.push('/company/internships');
            } else {
                toast.error(result.error || 'Failed to post internship');
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const suggestSkills = async () => {
        if (!formData.title || !formData.description) {
            toast.error('Enter title and description first');
            return;
        }
        setIsSuggesting(true);
        try {
            const result = await apiFetch('/api/ai/suggest-skills', {
                method: 'POST',
                body: JSON.stringify({ title: formData.title, description: formData.description }),
            });
            if (result.success) {
                const newSkills = Array.from(new Set([...skills, ...result.skills]));
                setSkills(newSkills);
                toast.success('Skills suggested by AI!');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSuggesting(false);
        }
    };

    const requestCollegeApproval = async () => {
        if (!formData.college_id) {
            toast.error('Select a college first');
            return;
        }

        setIsRequesting(true);
        try {
            const result = await apiFetch('/api/partnerships/request', {
                method: 'POST',
                body: JSON.stringify({ college_id: formData.college_id }),
            });
            toast.success(result.message || 'Request sent to college');
            setPartnershipStatus((result?.data?.status as PartnershipStatus) || 'pending');
        } catch (e: any) {
            toast.error(e.message || 'Failed to request approval');
        } finally {
            setIsRequesting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white">
                    <Plus className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Post New Internship</h1>
                    <p className="text-muted-foreground mt-1">AI will automatically match your posting with the most relevant candidates.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-8 md:grid-cols-3">
                {/* Main Details */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Core Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Internship Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. Full Stack Developer Intern"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description & Responsibilities</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe what the intern will be doing..."
                                    className="min-h-[200px]"
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary" /> Required Skills
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">Type a skill and press Enter. These are used for AI vector matching.</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={suggestSkills}
                                disabled={isSuggesting}
                                className="h-8 text-[10px] font-bold uppercase tracking-widest border-primary/20 hover:bg-primary/5"
                            >
                                {isSuggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'AI Suggest'}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2 mb-2">
                                {skills.map(skill => (
                                    <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                                        {skill}
                                        <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => removeSkill(skill)} />
                                    </Badge>
                                ))}
                            </div>
                            <Input
                                placeholder="e.g. React, Python, AWS..."
                                onKeyDown={handleAddSkill}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Configurations Sidebar */}
                <div className="space-y-6">
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Target College</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Select
                                options={colleges}
                                placeholder="Select college"
                                value={formData.college_id}
                                onChange={(e) => setFormData({ ...formData, college_id: e.target.value })}
                            />

                            {formData.college_id ? (
                                <div className="flex items-center gap-2 text-xs">
                                    {partnershipStatus === 'loading' ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                            <span className="text-muted-foreground">Checking approval status...</span>
                                        </>
                                    ) : partnershipStatus === 'approved' ? (
                                        <>
                                            <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                                            <span className="text-green-700 dark:text-green-400 font-semibold">
                                                Approved by college
                                            </span>
                                        </>
                                    ) : partnershipStatus === 'pending' ? (
                                        <>
                                            <Clock className="h-3.5 w-3.5 text-orange-500" />
                                            <span className="text-orange-600 dark:text-orange-400 font-semibold">
                                                Approval pending
                                            </span>
                                        </>
                                    ) : partnershipStatus === 'rejected' ? (
                                        <span className="text-red-600 dark:text-red-400 font-semibold">
                                            Request rejected
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">Not approved yet</span>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    Select a college to post a college-exclusive internship.
                                </p>
                            )}

                            {formData.college_id && (partnershipStatus === 'none' || partnershipStatus === 'rejected') && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={requestCollegeApproval}
                                    disabled={isRequesting}
                                    className="w-full"
                                >
                                    {isRequesting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request College Approval'}
                                </Button>
                            )}

                            {formData.college_id && partnershipStatus !== 'approved' && (
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Your request must be approved by the college TPO before you can post internships for their students.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Logistics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                    options={[
                                        { label: 'Remote', value: 'remote' },
                                        { label: 'On-site', value: 'in-office' },
                                        { label: 'Hybrid', value: 'hybrid' }
                                    ]}
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Duration (Weeks)</Label>
                                <Input
                                    type="number"
                                    value={formData.duration_weeks}
                                    onChange={(e) => setFormData({ ...formData, duration_weeks: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Input
                                    placeholder="e.g. Bangalore"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Compensation & Deadline</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 py-2">
                                <input
                                    type="checkbox"
                                    id="paid"
                                    checked={formData.is_paid}
                                    onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="paid">Is this a paid internship?</Label>
                            </div>
                            {formData.is_paid && (
                                <div className="space-y-2">
                                    <Label>Stipend (Monthly ₹)</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 15000"
                                        value={formData.stipend}
                                        onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Application Deadline</Label>
                                <Input
                                    type="date"
                                    value={formData.deadline}
                                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        className="w-full py-6 text-lg shadow-lg hover:shadow-primary/20 transition-all font-bold"
                        disabled={isLoading || !formData.college_id || partnershipStatus !== 'approved'}
                        type="submit"
                    >
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><Briefcase className="mr-2 h-5 w-5" /> Launch Internship</>}
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground">By launching, you agree to our fair recruitment terms.</p>
                </div>
            </form>
        </div>
    );
}
