'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, Zap, GraduationCap, MapPin, Briefcase, FileText, UploadCloud, Github, X } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { Country, State, City } from 'country-state-city';

const normalizeLocationValue = (value?: string | null) => (value || '').trim().toLowerCase();

const parseLocationParts = (location?: string | null) => {
    if (!location) return { city: '', state: '', country: '' };
    const parts = location.split(',').map(part => part.trim());
    return {
        city: parts[0] || '',
        state: parts[1] || '',
        country: parts[2] || '',
    };
};

export default function OnboardingPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [userRole, setUserRole] = useState('student');
    const [userId, setUserId] = useState<string>('');
    const [formData, setFormData] = useState({
        university: '',
        expected_graduation: '',
        preferred_roles: '',
        skills: '',
        github_username: '',
        resume_url: '',
        college_email: '',
        course_id: '',
        course_name: '',
        year_of_study: '',
        student_id_url: '',
        company_name: '',
        company_website: '',
        company_industry: '',
        company_size: '',
        hr_contact: '',
        company_linkedin_url: '',
        gst_number: '',
        company_document_url: '',
        college_name: '',
        college_id: '',
        college_official_email: '',
        college_website: '',
        college_verification_url: '',
    });
    const [uploadingField, setUploadingField] = useState<string | null>(null);
    const [colleges, setColleges] = useState<any[]>([]);
    const [availableCourses, setAvailableCourses] = useState<any[]>([]);
    const [isCoursesLoading, setIsCoursesLoading] = useState(false);
    const [selectedCourseDuration, setSelectedCourseDuration] = useState<number | null>(null);

    const [myCourses, setMyCourses] = useState<any[]>([]);
    const [newCourseName, setNewCourseName] = useState('');
    const [newCourseDuration, setNewCourseDuration] = useState('4');
    const [skillsDraft, setSkillsDraft] = useState('');
    const [preferredRolesDraft, setPreferredRolesDraft] = useState('');
    const [isSkillsOpen, setIsSkillsOpen] = useState(false);
    const [isPreferredRolesOpen, setIsPreferredRolesOpen] = useState(false);
    const [isLinkingGithub, setIsLinkingGithub] = useState(false);

    const COMMON_SKILLS = [
        'React', 'Node.js', 'Python', 'TypeScript', 'JavaScript', 'Next.js',
        'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'GraphQL',
        'Machine Learning', 'Data Science', 'Java', 'C++', 'C#', 'Go',
        'Rust', 'Ruby on Rails', 'PHP', 'Laravel', 'Django', 'FastAPI'
    ];

    const COMMON_ROLES = [
        'Frontend', 'Backend', 'Full Stack', 'Mobile', 'DevOps', 'Data Science',
        'Machine Learning', 'UI/UX', 'QA', 'Cloud', 'Cybersecurity', 'Product'
    ];

    const parseCommaList = (value: string) =>
        value.split(',').map(s => s.trim()).filter(Boolean);

    const listToCommaString = (items: string[]) => items.join(', ');

    const addSkill = (skill: string) => {
        const current = parseCommaList(formData.skills);
        if (current.includes(skill)) return;
        setFormData(prev => ({ ...prev, skills: listToCommaString([...current, skill]) }));
    };

    const removeSkill = (skill: string) => {
        const current = parseCommaList(formData.skills);
        setFormData(prev => ({ ...prev, skills: listToCommaString(current.filter(s => s !== skill)) }));
    };

    const addPreferredRole = (role: string) => {
        const current = parseCommaList(formData.preferred_roles);
        if (current.includes(role)) return;
        setFormData(prev => ({ ...prev, preferred_roles: listToCommaString([...current, role]) }));
    };

    const removePreferredRole = (role: string) => {
        const current = parseCommaList(formData.preferred_roles);
        setFormData(prev => ({ ...prev, preferred_roles: listToCommaString(current.filter(r => r !== role)) }));
    };

    // Location State
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');

    const countries = Country.getAllCountries();
    const states = selectedCountry ? State.getStatesOfCountry(selectedCountry) : [];
    const cities = (selectedCountry && selectedState) ? City.getCitiesOfState(selectedCountry, selectedState) : [];
    const selectedCountryName = Country.getCountryByCode(selectedCountry)?.name || '';
    const selectedStateName = State.getStateByCodeAndCountry(selectedState, selectedCountry)?.name || '';
    const canFilterColleges = Boolean(selectedCity && selectedState && selectedCountry);
    const filteredColleges = canFilterColleges
        ? colleges.filter((college) => {
            const location = parseLocationParts(college.location);
            return (
                normalizeLocationValue(location.city) === normalizeLocationValue(selectedCity) &&
                normalizeLocationValue(location.state) === normalizeLocationValue(selectedStateName) &&
                normalizeLocationValue(location.country) === normalizeLocationValue(selectedCountryName)
            );
        })
        : [];

    const router = useRouter();
    const supabase = createClient();
    const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

    const roleLabel = userRole === 'company'
        ? 'Company / Employer'
        : userRole === 'tpo'
            ? 'College / TPO'
            : 'Student / Candidate';

    const getFileName = (url?: string) => (url ? url.split('/').pop() || 'Uploaded file' : '');

    const uploadFile = async (file: File, bucket: string, folder: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        if (file.size > MAX_UPLOAD_SIZE) {
            throw new Error('File must be less than 5MB');
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleFileUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        field: string,
        bucket: string,
        folder: string
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingField(field);
        try {
            const url = await uploadFile(file, bucket, folder);
            setFormData(prev => ({ ...prev, [field]: url }));
            toast.success('File uploaded successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Upload failed');
        } finally {
            setUploadingField(null);
        }
    };

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            setUserId(session.user.id);
            // 1. Determine Role (Priority: Profile > URL > localStorage > metadata > default)
            let effectiveRole = 'student';
            const urlParams = new URLSearchParams(window.location.search);
            const urlRole = urlParams.get('role');
            const localStorageRole = typeof window !== 'undefined' ? localStorage.getItem('pending_registration_role') : null;
            const metadataRole = session.user.user_metadata?.role;

            const { data: profile } = await supabase
                .from('profiles')
                .select('is_onboarded, role, role_selected, github_username')
                .eq('id', session.user.id)
                .single();

            const roleSelected = profile?.role_selected ?? false;

            if (!roleSelected && !urlRole && !localStorageRole) {
                router.push('/select-role');
                return;
            }

            if (urlRole) {
                effectiveRole = urlRole;
            } else if (localStorageRole) {
                effectiveRole = localStorageRole;
            } else if (profile?.role) {
                effectiveRole = profile.role;
            } else if (metadataRole) {
                effectiveRole = metadataRole;
            }

            if (profile?.is_onboarded) {
                router.push(`/${profile.role || 'student'}`);
                return;
            }

            setUserRole(effectiveRole);
            setIsLoading(false);

            // Prefill GitHub connection state (set by /auth/callback after OAuth link)
            if (profile?.github_username) {
                setFormData((prev) => ({ ...prev, github_username: profile.github_username || '' }));
            }

            if (effectiveRole === 'tpo') {
                fetchMyCourses(session.user.id);
            }
        };
        checkSession();
        fetchColleges();
    }, [router, supabase.auth, supabase]);

    const fetchColleges = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, college_name, location')
                .in('role', ['tpo', 'college', 'college_tpo']);
            if (data) setColleges(data);
        } catch (e) {
            console.error('Error fetching colleges:', e);
        }
    };

    const fetchCoursesForCollege = async (collegeId: string) => {
        if (!collegeId || collegeId === 'other') {
            setAvailableCourses([]);
            setSelectedCourseDuration(null);
            return;
        }
        setIsCoursesLoading(true);
        try {
            const { data } = await supabase
                .from('college_courses')
                .select('id, name, duration_years')
                .eq('college_id', collegeId)
                .order('name', { ascending: true });
            setAvailableCourses(data || []);
        } catch (e) {
            console.error('Error fetching courses:', e);
            setAvailableCourses([]);
        } finally {
            setIsCoursesLoading(false);
        }
    };

    const fetchMyCourses = async (collegeId: string) => {
        try {
            const { data } = await supabase
                .from('college_courses')
                .select('id, name, duration_years')
                .eq('college_id', collegeId)
                .order('name', { ascending: true });
            setMyCourses(data || []);
        } catch (e) {
            console.error('Error fetching my courses:', e);
            setMyCourses([]);
        }
    };

    const handleAddCourse = async () => {
        const name = newCourseName.trim();
        const duration = parseInt(newCourseDuration) || 4;
        if (!name) {
            toast.error('Please enter a course name.');
            return;
        }
        if (!userId) {
            toast.error('Not authenticated.');
            return;
        }
        try {
            const { error } = await supabase
                .from('college_courses')
                .insert({
                    college_id: userId,
                    name,
                    duration_years: Math.max(1, Math.min(8, duration)),
                });
            if (error) throw error;
            setNewCourseName('');
            setNewCourseDuration('4');
            toast.success('Course added.');
            fetchMyCourses(userId);
        } catch (e: any) {
            toast.error(e.message || 'Failed to add course.');
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (!courseId) return;
        try {
            const { error } = await supabase
                .from('college_courses')
                .delete()
                .eq('id', courseId);
            if (error) throw error;
            toast.success('Course removed.');
            if (userId) fetchMyCourses(userId);
        } catch (e: any) {
            toast.error(e.message || 'Failed to remove course.');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCity || !selectedState || !selectedCountry) {
            toast.error("Please select a complete location (Country, State, and City)");
            return;
        }

        if (userRole === 'student') {
            const isOtherCollege = formData.college_id === 'other';
            if (!isOtherCollege) {
                if (!formData.college_id) {
                    toast.error('Please select your college.');
                    return;
                }
                if (availableCourses.length > 0 && !formData.course_id) {
                    toast.error('Please select your course.');
                    return;
                }
                if (availableCourses.length === 0 && !formData.course_name.trim()) {
                    toast.error('Please enter your course name.');
                    return;
                }
                if (!formData.year_of_study) {
                    toast.error('Please select your year of study.');
                    return;
                }
            } else {
                if (!formData.university.trim()) {
                    toast.error('Please enter your college/university name.');
                    return;
                }
                if (!formData.course_name.trim()) {
                    toast.error('Please enter your course name.');
                    return;
                }
                if (!formData.year_of_study) {
                    toast.error('Please enter your year of study.');
                    return;
                }
            }
        }

        setIsSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            // Construct full location string
            const countryName = Country.getCountryByCode(selectedCountry)?.name;
            const stateName = State.getStateByCodeAndCountry(selectedState, selectedCountry)?.name;
            const fullLocation = `${selectedCity}, ${stateName}, ${countryName}`;



            // 2. Format Data for the AI API
            const updatePayload: any = {
                is_onboarded: true,
                location: fullLocation,
                role: userRole,
                role_selected: true,
            };

            if (userRole === 'student') {
                const selectedCollege = colleges.find(c => c.id === formData.college_id);
                const resolvedCollegeName = selectedCollege?.college_name || selectedCollege?.full_name || formData.university || '';
                const isOtherCollege = formData.college_id === 'other';
                const selectedCourse = availableCourses.find((c) => c.id === formData.course_id);

                updatePayload.university = isOtherCollege ? formData.university : resolvedCollegeName;
                updatePayload.college_id = isOtherCollege ? null : (formData.college_id || null);
                updatePayload.college_name = isOtherCollege ? formData.university : resolvedCollegeName;
                updatePayload.student_verification_status = isOtherCollege ? 'verified' : 'pending';
                updatePayload.course_id = isOtherCollege ? null : (formData.course_id || null);
                updatePayload.course_name = isOtherCollege
                    ? (formData.course_name || null)
                    : (selectedCourse?.name || formData.course_name || null);
                updatePayload.year_of_study = formData.year_of_study ? parseInt(formData.year_of_study) : null;
                updatePayload.expected_graduation = parseInt(formData.expected_graduation) || null;
                updatePayload.preferred_roles = formData.preferred_roles.split(',').map(s => s.trim()).filter(s => s);
                updatePayload.skills = formData.skills.split(',').map(s => s.trim()).filter(s => s);
                if (formData.github_username?.trim()) {
                    updatePayload.github_username = formData.github_username.trim();
                }
                updatePayload.resume_url = formData.resume_url || null;
                updatePayload.college_email = formData.college_email || null;
                updatePayload.student_id_url = formData.student_id_url || null;
            } else if (userRole === 'tpo') {
                updatePayload.college_name = formData.college_name;
                updatePayload.university = formData.university || null;
                updatePayload.college_official_email = formData.college_official_email || null;
                updatePayload.college_website = formData.college_website || null;
                updatePayload.college_verification_url = formData.college_verification_url || null;
            } else if (userRole === 'company') {
                updatePayload.company_name = formData.company_name;
                updatePayload.company_website = formData.company_website;
                updatePayload.company_industry = formData.company_industry || null;
                updatePayload.company_size = formData.company_size || null;
                updatePayload.hr_contact = formData.hr_contact || null;
                updatePayload.company_linkedin_url = formData.company_linkedin_url || null;
                updatePayload.gst_number = formData.gst_number || null;
                updatePayload.company_document_url = formData.company_document_url || null;
            }

            // Call normal patch API
            const result = await apiFetch('/api/auth/profile', {
                method: 'PATCH',
                body: JSON.stringify(updatePayload)
            });

            if (result.success || result.data) {
                toast.success('Profile completed!');
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('pending_registration_role');
                    localStorage.removeItem('pending_verification_email');
                }
                window.location.href = `/${userRole}`;
            } else {
                throw new Error("Failed to save profile via API");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to complete onboarding.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
            <Card className="w-full max-w-lg shadow-2xl glass border-primary/20">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Zap size={28} />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-black">Complete Your Profile</CardTitle>
                        <CardDescription>Tell the AI a bit more to get the best internship matches.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-2">
                            <Label>Joining as</Label>
                            <div className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm flex items-center font-medium">
                                {roleLabel}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="flex items-center gap-2">
                                <MapPin size={14} className="text-primary" /> Your Location
                            </Label>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold opacity-50">Country</span>
                                    <select
                                        className="w-full h-9 px-3 py-1 rounded-md border border-input bg-background/50 text-xs focus:ring-1 focus:ring-primary outline-none"
                                        value={selectedCountry}
                                        onChange={(e) => {
                                            setSelectedCountry(e.target.value);
                                            setSelectedState('');
                                            setSelectedCity('');
                                            if (userRole === 'student') {
                                                setFormData(prev => ({ ...prev, college_id: '', university: '', college_name: '' }));
                                            }
                                        }}
                                        required
                                    >
                                        <option value="">Select Country</option>
                                        {countries.map((c) => (
                                            <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold opacity-50">State</span>
                                    <select
                                        className="w-full h-9 px-3 py-1 rounded-md border border-input bg-background/50 text-xs focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                                        value={selectedState}
                                        onChange={(e) => {
                                            setSelectedState(e.target.value);
                                            setSelectedCity('');
                                            if (userRole === 'student') {
                                                setFormData(prev => ({ ...prev, college_id: '', university: '', college_name: '' }));
                                            }
                                        }}
                                        disabled={!selectedCountry}
                                        required
                                    >
                                        <option value="">Select State</option>
                                        {states.map((s) => (
                                            <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold opacity-50">City</span>
                                    <select
                                        className="w-full h-9 px-3 py-1 rounded-md border border-input bg-background/50 text-xs focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                                        value={selectedCity}
                                        onChange={(e) => {
                                            setSelectedCity(e.target.value);
                                            if (userRole === 'student') {
                                                setFormData(prev => ({ ...prev, college_id: '', university: '', college_name: '' }));
                                            }
                                        }}
                                        disabled={!selectedState}
                                        required
                                    >
                                        <option value="">Select City</option>
                                        {cities.map((c) => (
                                            <option key={c.name} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {userRole === 'student' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="space-y-2">
                                    <Label>Select Your College</Label>
                                    <div className="relative">
                                        <GraduationCap className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground transition-all group-focus-within:text-primary" />
                                        <select
                                            className="w-full h-10 pl-8 pr-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                                            value={formData.college_id}
                                            onChange={(e) => {
                                                const college = colleges.find(c => c.id === e.target.value);
                                                setFormData({
                                                    ...formData,
                                                    college_id: e.target.value,
                                                    university: college?.college_name || college?.full_name || '',
                                                    college_name: college?.college_name || college?.full_name || '',
                                                    course_id: '',
                                                    course_name: '',
                                                    year_of_study: '',
                                                });
                                                setSelectedCourseDuration(null);
                                                fetchCoursesForCollege(e.target.value);
                                            }}
                                            disabled={!canFilterColleges}
                                            required
                                        >
                                            <option value="">
                                                {canFilterColleges ? 'Choose your institution...' : 'Select location to see colleges'}
                                            </option>
                                            {filteredColleges.map((c) => (
                                                <option key={c.id} value={c.id}>{c.college_name || c.full_name}</option>
                                            ))}
                                            <option value="other">Other / Not Listed</option>
                                        </select>
                                    </div>
                                    {canFilterColleges && filteredColleges.length === 0 && (
                                        <p className="text-[10px] text-muted-foreground">No colleges found for this location. Choose "Other / Not Listed" to enter manually.</p>
                                    )}
                                    {formData.college_id === 'other' && (
                                        <Input
                                            placeholder="Enter University/College Name"
                                            className="mt-2"
                                            value={formData.university}
                                            onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                                            required
                                        />
                                    )}
                                </div>

                                {/* Course + Year */}
                                {formData.college_id && formData.college_id !== 'other' && (
                                    <div className="space-y-2">
                                        <Label>Select Your Course</Label>
                                        <select
                                            className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background outline-none focus:ring-2 focus:ring-primary/20 appearance-none disabled:opacity-60"
                                            value={formData.course_id}
                                            onChange={(e) => {
                                                const selected = availableCourses.find((c) => c.id === e.target.value);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    course_id: e.target.value,
                                                    course_name: selected?.name || '',
                                                    year_of_study: '',
                                                }));
                                                setSelectedCourseDuration(typeof selected?.duration_years === 'number' ? selected.duration_years : null);
                                            }}
                                            disabled={isCoursesLoading || !formData.college_id}
                                            required={availableCourses.length > 0}
                                        >
                                            <option value="">
                                                {isCoursesLoading ? 'Loading courses...' : (availableCourses.length > 0 ? 'Choose your course...' : 'No courses found (enter manually below)')}
                                            </option>
                                            {availableCourses.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name} ({c.duration_years} yrs)</option>
                                            ))}
                                        </select>

                                        {availableCourses.length === 0 && !isCoursesLoading && (
                                            <Input
                                                className="mt-2"
                                                placeholder="Enter Course Name (e.g. B.Tech CSE)"
                                                value={formData.course_name}
                                                onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                                                required
                                            />
                                        )}
                                    </div>
                                )}

                                {formData.college_id && (
                                    <div className="space-y-2">
                                        <Label>Year of Study</Label>
                                        <select
                                            className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background outline-none focus:ring-2 focus:ring-primary/20 appearance-none disabled:opacity-60"
                                            value={formData.year_of_study}
                                            onChange={(e) => setFormData({ ...formData, year_of_study: e.target.value })}
                                            disabled={!formData.college_id || (formData.college_id !== 'other' && availableCourses.length > 0 && !formData.course_id)}
                                            required
                                        >
                                            <option value="">Select year...</option>
                                            {Array.from({ length: Math.max(1, Math.min(8, selectedCourseDuration || 4)) })
                                                .map((_, idx) => {
                                                    const year = idx + 1;
                                                    return <option key={year} value={String(year)}>{`Year ${year}`}</option>;
                                                })}
                                        </select>
                                        <p className="text-[10px] text-muted-foreground">
                                            {selectedCourseDuration ? `Based on course duration: ${selectedCourseDuration} years.` : 'Select a course to auto-limit years.'}
                                        </p>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Expected Graduation Year</Label>
                                    <Input
                                        type="number"
                                        placeholder="2025"
                                        value={formData.expected_graduation}
                                        onChange={(e) => setFormData({ ...formData, expected_graduation: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Preferred Roles</Label>
                                    <div className="relative">
                                        <div className="flex flex-wrap gap-2 p-2 min-h-10 items-center border border-input rounded-md bg-background focus-within:ring-1 focus-within:ring-primary">
                                            {parseCommaList(formData.preferred_roles).map((role) => (
                                                <Badge key={role} variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20">
                                                    {role}
                                                    <X
                                                        className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100"
                                                        onClick={() => removePreferredRole(role)}
                                                    />
                                                </Badge>
                                            ))}
                                            <div className="relative flex-1 min-w-[140px]">
                                                <Briefcase className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    className="w-full h-10 pl-8 pr-3 bg-transparent outline-none text-sm"
                                                    placeholder={parseCommaList(formData.preferred_roles).length ? 'Add another role...' : 'Frontend, ML, UI/UX...'}
                                                    value={preferredRolesDraft}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setPreferredRolesDraft(value);
                                                        setIsPreferredRolesOpen(true);
                                                        if (value.endsWith(',')) {
                                                            const newRole = value.slice(0, -1).trim();
                                                            if (newRole) addPreferredRole(newRole);
                                                            setPreferredRolesDraft('');
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const newRole = preferredRolesDraft.trim();
                                                            if (newRole) addPreferredRole(newRole);
                                                            setPreferredRolesDraft('');
                                                            setIsPreferredRolesOpen(false);
                                                        } else if (e.key === 'Backspace' && !preferredRolesDraft) {
                                                            const current = parseCommaList(formData.preferred_roles);
                                                            if (current.length > 0) removePreferredRole(current[current.length - 1]);
                                                        }
                                                    }}
                                                    onFocus={() => setIsPreferredRolesOpen(true)}
                                                    onBlur={() => setTimeout(() => setIsPreferredRolesOpen(false), 150)}
                                                />
                                            </div>
                                        </div>

                                        {isPreferredRolesOpen && (
                                            <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                                                {COMMON_ROLES
                                                    .filter(r => r.toLowerCase().includes(preferredRolesDraft.toLowerCase()) && !parseCommaList(formData.preferred_roles).includes(r))
                                                    .map((role) => (
                                                        <div
                                                            key={role}
                                                            className="px-3 py-2 text-sm cursor-pointer hover:bg-muted text-popover-foreground"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                addPreferredRole(role);
                                                                setPreferredRolesDraft('');
                                                                setIsPreferredRolesOpen(false);
                                                            }}
                                                        >
                                                            {role}
                                                        </div>
                                                    ))}
                                                {preferredRolesDraft && !COMMON_ROLES.some(r => r.toLowerCase() === preferredRolesDraft.trim().toLowerCase()) && (
                                                    <div
                                                        className="px-3 py-2 text-sm cursor-pointer hover:bg-muted text-primary font-medium"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            const newRole = preferredRolesDraft.trim();
                                                            if (newRole) addPreferredRole(newRole);
                                                            setPreferredRolesDraft('');
                                                            setIsPreferredRolesOpen(false);
                                                        }}
                                                    >
                                                        Add custom: &quot;{preferredRolesDraft.trim()}&quot;
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Pick from dropdown or type and press Enter.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Skills</Label>
                                    <div className="relative">
                                        <div className="flex flex-wrap gap-2 p-2 min-h-10 items-center border border-input rounded-md bg-background focus-within:ring-1 focus-within:ring-primary">
                                            {parseCommaList(formData.skills).map((skill) => (
                                                <Badge key={skill} variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20">
                                                    {skill}
                                                    <X
                                                        className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100"
                                                        onClick={() => removeSkill(skill)}
                                                    />
                                                </Badge>
                                            ))}
                                            <input
                                                type="text"
                                                className="flex-1 bg-transparent outline-none min-w-[140px] text-sm"
                                                placeholder={parseCommaList(formData.skills).length ? 'Add another skill...' : 'React, Python, SQL...'}
                                                value={skillsDraft}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setSkillsDraft(value);
                                                    setIsSkillsOpen(true);
                                                    if (value.endsWith(',')) {
                                                        const newSkill = value.slice(0, -1).trim();
                                                        if (newSkill) addSkill(newSkill);
                                                        setSkillsDraft('');
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const newSkill = skillsDraft.trim();
                                                        if (newSkill) addSkill(newSkill);
                                                        setSkillsDraft('');
                                                        setIsSkillsOpen(false);
                                                    } else if (e.key === 'Backspace' && !skillsDraft) {
                                                        const current = parseCommaList(formData.skills);
                                                        if (current.length > 0) removeSkill(current[current.length - 1]);
                                                    }
                                                }}
                                                onFocus={() => setIsSkillsOpen(true)}
                                                onBlur={() => setTimeout(() => setIsSkillsOpen(false), 150)}
                                            />
                                        </div>

                                        {isSkillsOpen && (
                                            <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                                                {COMMON_SKILLS
                                                    .filter(s => s.toLowerCase().includes(skillsDraft.toLowerCase()) && !parseCommaList(formData.skills).includes(s))
                                                    .map((skill) => (
                                                        <div
                                                            key={skill}
                                                            className="px-3 py-2 text-sm cursor-pointer hover:bg-muted text-popover-foreground"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                addSkill(skill);
                                                                setSkillsDraft('');
                                                                setIsSkillsOpen(false);
                                                            }}
                                                        >
                                                            {skill}
                                                        </div>
                                                    ))}
                                                {skillsDraft && !COMMON_SKILLS.some(s => s.toLowerCase() === skillsDraft.trim().toLowerCase()) && (
                                                    <div
                                                        className="px-3 py-2 text-sm cursor-pointer hover:bg-muted text-primary font-medium"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            const newSkill = skillsDraft.trim();
                                                            if (newSkill) addSkill(newSkill);
                                                            setSkillsDraft('');
                                                            setIsSkillsOpen(false);
                                                        }}
                                                    >
                                                        Add custom: &quot;{skillsDraft.trim()}&quot;
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Pick from dropdown or type and press Enter.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>GitHub (Recommended)</Label>
                                    {formData.github_username ? (
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center">
                                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                                </div>
                                                <span className="text-sm font-bold tracking-tight">@{formData.github_username}</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-[9px] uppercase font-black opacity-60 hover:opacity-100"
                                                onClick={async () => {
                                                    setFormData((prev) => ({ ...prev, github_username: '' }));
                                                    try {
                                                        await apiFetch('/api/auth/profile', {
                                                            method: 'PATCH',
                                                            body: JSON.stringify({ github_username: null }),
                                                        });
                                                    } catch (e) { }
                                                }}
                                            >
                                                Disconnect
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-muted-foreground leading-tight">
                                                Connect your real GitHub account. We will auto-fill your username and use it for skill verification.
                                            </p>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="w-full h-9 font-bold"
                                                disabled={isLinkingGithub}
                                                onClick={async () => {
                                                    setIsLinkingGithub(true);
                                                    try {
                                                        const { error } = await supabase.auth.linkIdentity({
                                                            provider: 'github',
                                                            options: { redirectTo: `${window.location.origin}/auth/callback` },
                                                        });
                                                        if (error) throw error;
                                                    } catch (e: any) {
                                                        toast.error(e.message || 'Failed to connect GitHub');
                                                        setIsLinkingGithub(false);
                                                    }
                                                }}
                                            >
                                                {isLinkingGithub ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Github className="mr-2 h-4 w-4" />
                                                        Connect with GitHub
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>College Email (Optional)</Label>
                                    <Input
                                        type="email"
                                        placeholder="name@college.edu"
                                        value={formData.college_email}
                                        onChange={(e) => setFormData({ ...formData, college_email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Resume (PDF)</Label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="file"
                                            id="resume-file"
                                            className="hidden"
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e) => handleFileUpload(e, 'resume_url', 'resumes', 'resumes')}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={uploadingField === 'resume_url'}
                                            onClick={() => document.getElementById('resume-file')?.click()}
                                        >
                                            <FileText className="mr-2 h-4 w-4" /> {formData.resume_url ? 'Replace Resume' : 'Upload Resume'}
                                        </Button>
                                        {formData.resume_url && (
                                            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                                                {getFileName(formData.resume_url)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Student ID Upload</Label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="file"
                                            id="student-id-file"
                                            className="hidden"
                                            accept=".pdf,.png,.jpg,.jpeg"
                                            onChange={(e) => handleFileUpload(e, 'student_id_url', 'verification-documents', 'students')}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={uploadingField === 'student_id_url'}
                                            onClick={() => document.getElementById('student-id-file')?.click()}
                                        >
                                            <UploadCloud className="mr-2 h-4 w-4" /> {formData.student_id_url ? 'Replace ID' : 'Upload ID'}
                                        </Button>
                                        {formData.student_id_url && (
                                            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                                                {getFileName(formData.student_id_url)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {userRole === 'tpo' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="space-y-2">
                                    <Label>College / Institution Name</Label>
                                    <Input
                                        placeholder="e.g. MIT, Stanford"
                                        value={formData.college_name}
                                        onChange={(e) => setFormData({ ...formData, college_name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Courses Offered</Label>
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div className="md:col-span-2">
                                            <Input
                                                placeholder="e.g. B.Tech Computer Science"
                                                value={newCourseName}
                                                onChange={(e) => setNewCourseName(e.target.value)}
                                            />
                                        </div>
                                        <select
                                            className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                                            value={newCourseDuration}
                                            onChange={(e) => setNewCourseDuration(e.target.value)}
                                        >
                                            {[2, 3, 4, 5].map((y) => (
                                                <option key={y} value={String(y)}>{y} years</option>
                                            ))}
                                            <option value="1">1 year</option>
                                            <option value="6">6 years</option>
                                        </select>
                                    </div>
                                    <Button type="button" variant="outline" onClick={handleAddCourse} disabled={!newCourseName.trim()}>
                                        Add Course
                                    </Button>

                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {myCourses.map((c) => (
                                            <Badge key={c.id} variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20">
                                                {c.name} ({c.duration_years}y)
                                                <X
                                                    className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100"
                                                    onClick={() => handleDeleteCourse(c.id)}
                                                />
                                            </Badge>
                                        ))}
                                        {myCourses.length === 0 && (
                                            <p className="text-[10px] text-muted-foreground">
                                                Add your courses here so students can select them during onboarding.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>University</Label>
                                    <Input
                                        placeholder="e.g. Anna University"
                                        value={formData.university}
                                        onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Official Domain Email</Label>
                                    <Input
                                        type="email"
                                        placeholder="tpo@college.edu"
                                        value={formData.college_official_email}
                                        onChange={(e) => setFormData({ ...formData, college_official_email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>College Website</Label>
                                    <Input
                                        type="url"
                                        placeholder="https://college.edu"
                                        value={formData.college_website}
                                        onChange={(e) => setFormData({ ...formData, college_website: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Verification Document</Label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="file"
                                            id="college-doc-file"
                                            className="hidden"
                                            accept=".pdf,.png,.jpg,.jpeg"
                                            onChange={(e) => handleFileUpload(e, 'college_verification_url', 'verification-documents', 'colleges')}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={uploadingField === 'college_verification_url'}
                                            onClick={() => document.getElementById('college-doc-file')?.click()}
                                        >
                                            <UploadCloud className="mr-2 h-4 w-4" /> {formData.college_verification_url ? 'Replace Document' : 'Upload Document'}
                                        </Button>
                                        {formData.college_verification_url && (
                                            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                                                {getFileName(formData.college_verification_url)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground">Registering your college allows your students to select it during their onboarding.</p>
                            </div>
                        )}

                        {userRole === 'company' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="space-y-2">
                                    <Label>Company Name</Label>
                                    <Input
                                        placeholder="Acme Corp"
                                        value={formData.company_name}
                                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Company Website</Label>
                                    <Input
                                        placeholder="https://acme.com"
                                        value={formData.company_website}
                                        onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Industry</Label>
                                    <Input
                                        placeholder="e.g. SaaS, FinTech"
                                        value={formData.company_industry}
                                        onChange={(e) => setFormData({ ...formData, company_industry: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Company Size</Label>
                                    <Input
                                        placeholder="e.g. 11-50"
                                        value={formData.company_size}
                                        onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>HR Contact</Label>
                                    <Input
                                        type="email"
                                        placeholder="hr@company.com"
                                        value={formData.hr_contact}
                                        onChange={(e) => setFormData({ ...formData, hr_contact: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>LinkedIn Page</Label>
                                    <Input
                                        type="url"
                                        placeholder="https://www.linkedin.com/company/your-company"
                                        value={formData.company_linkedin_url}
                                        onChange={(e) => setFormData({ ...formData, company_linkedin_url: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>GST Number</Label>
                                    <Input
                                        placeholder="GSTIN"
                                        value={formData.gst_number}
                                        onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Verification Document</Label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="file"
                                            id="company-doc-file"
                                            className="hidden"
                                            accept=".pdf,.png,.jpg,.jpeg"
                                            onChange={(e) => handleFileUpload(e, 'company_document_url', 'verification-documents', 'companies')}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={uploadingField === 'company_document_url'}
                                            onClick={() => document.getElementById('company-doc-file')?.click()}
                                        >
                                            <UploadCloud className="mr-2 h-4 w-4" /> {formData.company_document_url ? 'Replace Document' : 'Upload Document'}
                                        </Button>
                                        {formData.company_document_url && (
                                            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                                                {getFileName(formData.company_document_url)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button type="submit" className="w-full font-bold uppercase tracking-widest" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Launch Dashboard'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
