'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Zap, GraduationCap, MapPin, Briefcase } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { Country, State, City } from 'country-state-city';

export default function OnboardingPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [userRole, setUserRole] = useState('student');
    const [formData, setFormData] = useState({
        university: '',
        expected_graduation: '',
        preferred_roles: '',
        company_name: '',
        company_website: '',
        college_name: '',
        college_id: '',
    });
    const [colleges, setColleges] = useState<any[]>([]);

    // Location State
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');

    const countries = Country.getAllCountries();
    const states = selectedCountry ? State.getStatesOfCountry(selectedCountry) : [];
    const cities = (selectedCountry && selectedState) ? City.getCitiesOfState(selectedCountry, selectedState) : [];

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            // 1. Determine Role (Priority: Profile > URL > localStorage > metadata > default)
            let effectiveRole = 'student';
            const urlParams = new URLSearchParams(window.location.search);
            const urlRole = urlParams.get('role');
            const localStorageRole = typeof window !== 'undefined' ? localStorage.getItem('pending_registration_role') : null;
            const metadataRole = session.user.user_metadata?.role;

            const { data: profile } = await supabase.from('profiles').select('is_onboarded, role').eq('id', session.user.id).single();

            if (urlRole) {
                effectiveRole = urlRole;
            } else if (localStorageRole) {
                effectiveRole = localStorageRole;
            } else if (profile?.role && profile.role !== 'student') {
                effectiveRole = profile.role;
            } else if (metadataRole) {
                effectiveRole = metadataRole;
            } else if (profile?.role) {
                effectiveRole = profile.role;
            }

            if (profile?.is_onboarded) {
                router.push(`/${profile.role || 'student'}`);
                return;
            }

            setUserRole(effectiveRole);
            setIsLoading(false);
        };
        checkSession();
        fetchColleges();
    }, [router, supabase.auth, supabase]);

    const fetchColleges = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, college_name')
                .eq('role', 'tpo');
            if (data) setColleges(data);
        } catch (e) {
            console.error('Error fetching colleges:', e);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCity || !selectedState || !selectedCountry) {
            toast.error("Please select a complete location (Country, State, and City)");
            return;
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
                role: userRole // Explicitly include role in payload
            };

            if (userRole === 'student') {
                updatePayload.university = formData.university;
                updatePayload.college_id = formData.college_id;
                updatePayload.expected_graduation = parseInt(formData.expected_graduation) || null;
                updatePayload.preferred_roles = formData.preferred_roles.split(',').map(s => s.trim()).filter(s => s);
            } else if (userRole === 'tpo') {
                updatePayload.college_name = formData.college_name;
            } else if (userRole === 'company') {
                updatePayload.company_name = formData.company_name;
                updatePayload.company_website = formData.company_website;
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
                            <Label>I am joining as a...</Label>
                            <select
                                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={userRole}
                                onChange={(e) => setUserRole(e.target.value)}
                            >
                                <option value="student">Student / Candidate</option>
                                <option value="company">Company / Employer</option>
                                <option value="tpo">College / TPO</option>
                            </select>
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
                                                    university: college?.college_name || college?.full_name || ''
                                                });
                                            }}
                                            required
                                        >
                                            <option value="">Choose your institution...</option>
                                            {colleges.map((c) => (
                                                <option key={c.id} value={c.id}>{c.college_name || c.full_name}</option>
                                            ))}
                                            <option value="other">Other / Not Listed</option>
                                        </select>
                                    </div>
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
                                    <Label>Preferred Roles (Comma separated)</Label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="e.g. Frontend, Machine Learning, UI/UX"
                                            className="pl-8"
                                            value={formData.preferred_roles}
                                            onChange={(e) => setFormData({ ...formData, preferred_roles: e.target.value })}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Helps AI filter the best positions for you.</p>
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
                                    />
                                </div>
                            </div>
                        )}

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
                                        onChange={(e) => setSelectedCity(e.target.value)}
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

                        <Button type="submit" className="w-full font-bold uppercase tracking-widest" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Launch Dashboard'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
