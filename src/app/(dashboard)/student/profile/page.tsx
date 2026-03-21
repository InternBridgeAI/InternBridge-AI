'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Github, Linkedin, Save, Loader2, Link as LinkIcon, GraduationCap, User, Sparkles, CheckCircle, MapPin, Plus, Briefcase, X, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import { Country, State, City } from 'country-state-city';

export default function ProfilePage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [profile, setProfile] = useState<any>({
        full_name: '',
        email: '',
        github_username: '',
        linkedin_url: '',
        cgpa: '',
        skills: [],
        avatar_url: '',
        university: '',
        expected_graduation: '',
        gender: '',
        preferred_roles: '',
        location: '',
        resume_url: '',
    });
    const [isLinkingGithub, setIsLinkingGithub] = useState(false);
    const [isLinkingLinkedin, setIsLinkingLinkedin] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [projectInput, setProjectInput] = useState({ name: '', description: '', technologies: '', link: '' });
    const [githubVerification, setGithubVerification] = useState<any>(null);

    // Skills State
    const [skillDraft, setSkillDraft] = useState('');
    const [isSkillsOpen, setIsSkillsOpen] = useState(false);

    const COMMON_SKILLS = [
        'React', 'Node.js', 'Python', 'TypeScript', 'JavaScript', 'Next.js',
        'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'GraphQL',
        'Machine Learning', 'Data Science', 'Java', 'C++', 'C#', 'Go',
        'Rust', 'Ruby on Rails', 'PHP', 'Laravel', 'Django', 'FastAPI'
    ];

    // Location State
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');

    const countries = Country.getAllCountries();
    const states = selectedCountry ? State.getStatesOfCountry(selectedCountry) : [];
    const cities = (selectedCountry && selectedState) ? City.getCitiesOfState(selectedCountry, selectedState) : [];

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const result = await apiFetch('/api/auth/profile');
            if (result.success) {
                const data = result.data;
                setProfile({
                    ...data,
                    skills: data.skills || [],
                    projects: data.projects || [],
                    github_username: data.github_username || '',
                    linkedin_url: data.linkedin_url || '',
                    university: data.university || '',
                    expected_graduation: data.expected_graduation || '',
                    gender: data.gender || '',
                    preferred_roles: data.preferred_roles ? data.preferred_roles.join(', ') : '',
                    location: data.location || '',
                });

                // Try to parse existing location "City, State, Country"
                if (data.location) {
                    const parts = data.location.split(',').map((s: string) => s.trim());
                    if (parts.length === 3) {
                        const [cityName, stateName, countryName] = parts;
                        // Find Country
                        const country = Country.getAllCountries().find(c => c.name === countryName);
                        if (country) {
                            setSelectedCountry(country.isoCode);
                            // Find State
                            const state = State.getStatesOfCountry(country.isoCode).find(s => s.name === stateName);
                            if (state) {
                                setSelectedState(state.isoCode);
                                setSelectedCity(cityName);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            // Construct location string
            let fullLocation = profile.location;
            if (selectedCountry && selectedState && selectedCity) {
                const countryName = Country.getCountryByCode(selectedCountry)?.name;
                const stateName = State.getStateByCodeAndCountry(selectedState, selectedCountry)?.name;
                fullLocation = `${selectedCity}, ${stateName}, ${countryName}`;
            }

            const payload = {
                ...profile,
                location: fullLocation,
                expected_graduation: profile.expected_graduation ? parseInt(profile.expected_graduation) : null,
                preferred_roles: profile.preferred_roles ? (typeof profile.preferred_roles === 'string' ? profile.preferred_roles.split(',').map((s: string) => s.trim()).filter(Boolean) : profile.preferred_roles) : [],
                skills: profile.skills || [],
            };

            const result = await apiFetch('/api/auth/profile', {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            if (result.success) {
                toast.success('Profile updated successfully');
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddProject = () => {
        if (!projectInput.name || !projectInput.description) {
            toast.error('Project name and description are required');
            return;
        }

        const newProject = {
            ...projectInput,
            technologies: projectInput.technologies.split(',').map(s => s.trim()).filter(Boolean)
        };

        const updatedProfile = {
            ...profile,
            projects: [...(profile.projects || []), newProject]
        };

        setProfile(updatedProfile);
        setProjectInput({ name: '', description: '', technologies: '', link: '' });
        // Auto-save
        setTimeout(() => handleSave(), 100);
    };

    const handleRemoveProject = (index: number) => {
        const updatedProjects = [...profile.projects];
        updatedProjects.splice(index, 1);
        const updatedProfile = { ...profile, projects: updatedProjects };
        setProfile(updatedProfile);
        setTimeout(() => handleSave(), 100);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB');
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        setIsUploading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const publicUrl = data.publicUrl;

            await apiFetch('/api/auth/profile', {
                method: 'PATCH',
                body: JSON.stringify({ avatar_url: publicUrl }),
            });

            setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
            toast.success('Profile picture updated!');

        } catch (error: any) {
            toast.error(error.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Resume must be less than 5MB');
            return;
        }

        setIsUploading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `resumes/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('resumes')
                .getPublicUrl(filePath);

            const publicUrl = data.publicUrl;

            // Update profile via API
            await apiFetch('/api/auth/profile', {
                method: 'PATCH',
                body: JSON.stringify({ resume_url: publicUrl }),
            });

            let parseSummary = '';
            try {
                const parseResult = await apiFetch('/api/ai/parse-resume-file', {
                    method: 'POST',
                    body: JSON.stringify({ resumeUrl: publicUrl }),
                });

                if (parseResult.success) {
                    parseSummary = `AI parsed ${parseResult.data?.skills?.length || 0} skills`;
                    setProfile((prev: any) => ({
                        ...prev,
                        resume_url: publicUrl,
                        market_readiness_score: parseResult.marketReadinessScore,
                        skills: parseResult.data?.skills?.length ? parseResult.data.skills : prev.skills,
                        full_name: prev.full_name || parseResult.data?.full_name || '',
                    }));
                }
            } catch (parseError: any) {
                toast.error(parseError.message || 'Resume uploaded, but AI could not extract text from this file.');
            }

            toast.success(parseSummary ? `Resume uploaded. ${parseSummary}.` : 'Resume uploaded successfully!');
            fetchProfile();

        } catch (error: any) {
            toast.error(error.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const verifyGithub = async () => {
        if (!profile.github_username) {
            toast.error('Connect your GitHub account first');
            return;
        }
        setIsVerifying(true);
        try {
            const result = await apiFetch('/api/ai/github-verify', {
                method: 'POST',
                body: JSON.stringify({
                    githubUsername: profile.github_username,
                    claimedSkills: profile.skills || []
                }),
            });
            if (result.success) {
                setGithubVerification(result.data);
                setProfile((prev: any) => ({
                    ...prev,
                    market_readiness_score: result.marketReadinessScore ?? prev.market_readiness_score,
                }));
                toast.success(`Verified ${result.data.verifiedSkills.length} skills. Evidence score: ${result.data.evidenceScore ?? 0}.`);
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred');
        } finally {
            setIsVerifying(false);
        }
    };

    const readinessScore = typeof profile?.market_readiness_score === 'number'
        ? Math.round(profile.market_readiness_score)
        : null;

    if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-xs">Synchronizing AI Profiles...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Profile & Identity</h1>
                <p className="text-muted-foreground mt-2">Connect your professional ecosystem for deeper AI matching accuracy.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Left: Identity & Socials */}
                <div className="space-y-6">
                    <Card className="glass relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                            <User size={80} />
                        </div>
                        <CardContent className="pt-8 text-center">
                            <div
                                className="relative mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 border-2 border-primary/20 overflow-hidden shadow-xl shadow-primary/5 cursor-pointer group/avatar"
                                onClick={() => document.getElementById('avatar-file')?.click()}
                            >
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover group-hover/avatar:opacity-50 transition-opacity" />
                                ) : (
                                    <User className="h-12 w-12 text-primary group-hover/avatar:opacity-50 transition-opacity" />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity bg-black/20">
                                    <Plus className="h-6 w-6 text-white" />
                                </div>
                                {isUploading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            <input type="file" id="avatar-file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                            <h3 className="text-lg font-black tracking-tight">{profile.full_name || 'SYNCING...'}</h3>
                            <p className="text-xs text-muted-foreground font-medium">{profile.email}</p>
                            <Badge className="mt-3 bg-primary/10 text-primary border-primary/20 px-3 uppercase text-[10px] font-black tracking-widest" variant="outline">{profile.role || 'STUDENT'}</Badge>
                        </CardContent>
                    </Card>

                    <Card className="glass overflow-hidden shadow-2xl">
                        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <LinkIcon size={14} className="text-primary" /> Connected Ecosystem
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-6">
                            {/* Resume Upload */}
                            <div className="space-y-3 pb-6 border-b border-border/50">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                                    <Plus size={12} /> Master Resume (PDF)
                                </Label>
                                {profile.resume_url ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                                            <span className="text-[10px] font-bold truncate max-w-[150px]">
                                                {profile.resume_url.split('/').pop()}
                                            </span>
                                            <Button variant="ghost" size="sm" className="h-6 text-[9px] uppercase font-black" asChild>
                                                <a href={profile.resume_url} target="_blank" rel="noopener noreferrer">View</a>
                                            </Button>
                                        </div>
                                        <Button variant="outline" size="sm" className="w-full text-[10px] font-bold h-8" onClick={() => document.getElementById('resume-file')?.click()}>
                                            Change Resume
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => document.getElementById('resume-file')?.click()}>
                                        <Briefcase className="h-6 w-6 text-primary mb-2 opacity-50" />
                                        <p className="text-[10px] font-bold text-primary uppercase">Upload Resume</p>
                                    </div>
                                )}
                                <input type="file" id="resume-file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} />
                                {isUploading && <p className="text-[9px] text-center text-primary animate-pulse font-bold uppercase tracking-widest">AI Analyzing Resume...</p>}
                            </div>

                            {/* GitHub Connection */}
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                                    <Github size={12} /> GitHub Profile
                                </Label>
                                {profile.github_username ? (
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20 shadow-inner">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center">
                                                <CheckCircle className="h-3 w-3 text-green-500" />
                                            </div>
                                            <span className="text-sm font-bold tracking-tight">@{profile.github_username}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[9px] uppercase font-black opacity-50 hover:opacity-100"
                                            onClick={async () => {
                                                setProfile({ ...profile, github_username: '' });
                                                setGithubVerification(null);
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
                                            Connect your real GitHub account. Our AI will analyze your repositories and automatically verify your technical skills.
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full h-9 font-bold hover:bg-muted"
                                            disabled={isLinkingGithub}
                                            onClick={async () => {
                                                setIsLinkingGithub(true);
                                                try {
                                                    const supabase = createClient();
                                                    const { error } = await supabase.auth.linkIdentity({
                                                        provider: 'github',
                                                        options: {
                                                            redirectTo: `${window.location.origin}/auth/callback`
                                                        }
                                                    });
                                                    if (error) throw error;
                                                    // Page will redirect to GitHub for authorization
                                                } catch (e: any) {
                                                    toast.error(e.message || 'Failed to initiate GitHub link');
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
                                <p className="text-[9px] text-center text-muted-foreground italic">Verified via GitHub OAuth — no fake input accepted</p>
                                {githubVerification && (
                                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">AI Evidence Snapshot</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {githubVerification.totalRepos} repos scanned • {githubVerification.recentRepos} active in last 12 months
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black tracking-tight text-primary">{githubVerification.evidenceScore ?? 0}</p>
                                                <p className="text-[9px] uppercase font-bold text-muted-foreground">Evidence Score</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Verified Skills</p>
                                            <div className="flex flex-wrap gap-2">
                                                {(githubVerification.verifiedSkills || []).length > 0 ? (
                                                    githubVerification.verifiedSkills.map((skill: string) => (
                                                        <Badge key={skill} variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-300">
                                                            {skill}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-muted-foreground">No strong GitHub evidence found yet.</p>
                                                )}
                                            </div>
                                        </div>
                                        {(githubVerification.unverifiedSkills || []).length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Needs Better Proof</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {githubVerification.unverifiedSkills.map((skill: string) => (
                                                        <Badge key={skill} variant="outline" className="border-yellow-500/30 text-yellow-700 dark:text-yellow-300">
                                                            {skill}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>


                            {/* LinkedIn Connection */}
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                                    <Linkedin size={12} /> LinkedIn Profile
                                </Label>
                                {profile.linkedin_url ? (
                                    <>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 shadow-inner">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                                                    <CheckCircle className="h-3 w-3 text-blue-500" />
                                                </div>
                                                <span className="text-xs font-bold tracking-tight truncate max-w-[120px]">
                                                    {profile.linkedin_url.split('/in/')[1]?.replace(/\/$/, '') || 'Connected'}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-[9px] uppercase font-black opacity-50 hover:opacity-100"
                                                onClick={async () => {
                                                    const newProfile = { ...profile, linkedin_url: '' };
                                                    setProfile(newProfile);
                                                    try {
                                                        await apiFetch('/api/auth/profile', {
                                                            method: 'PATCH',
                                                            body: JSON.stringify({ linkedin_url: null }),
                                                        });
                                                    } catch (e) { }
                                                }}
                                            >
                                                Disconnect
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-muted-foreground leading-tight">
                                            Connect your real LinkedIn account. Our AI will verify your professional experience and endorsements to improve match quality.
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full h-9 font-bold hover:bg-muted"
                                            disabled={isLinkingLinkedin}
                                            onClick={async () => {
                                                setIsLinkingLinkedin(true);
                                                try {
                                                    const supabase = createClient();
                                                    const { error } = await supabase.auth.linkIdentity({
                                                        provider: 'linkedin_oidc',
                                                        options: {
                                                            redirectTo: `${window.location.origin}/auth/callback`
                                                        }
                                                    });
                                                    if (error) throw error;
                                                    // Page will redirect to LinkedIn for authorization
                                                } catch (e: any) {
                                                    toast.error(e.message || 'Failed to initiate LinkedIn link');
                                                    setIsLinkingLinkedin(false);
                                                }
                                            }}
                                        >
                                            {isLinkingLinkedin ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Linkedin className="mr-2 h-4 w-4" />
                                                    Connect with LinkedIn
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                                <p className="text-[9px] text-center text-muted-foreground italic px-2">Verified via LinkedIn OAuth — no manual input</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Personal Details & Skills */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            value={profile.full_name || ''}
                                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cgpa">CGPA / Percentage</Label>
                                        <Input
                                            id="cgpa"
                                            type="number"
                                            step="0.01"
                                            value={profile.cgpa || ''}
                                            onChange={(e) => setProfile({ ...profile, cgpa: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="skills">Skills</Label>
                                    <div className="relative">
                                        <div className="flex flex-wrap gap-2 p-2 min-h-10 items-center border border-input rounded-md bg-background focus-within:ring-1 focus-within:ring-primary">
                                            {(profile.skills || []).map((skill: string) => (
                                                <Badge key={skill} variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20">
                                                    {skill}
                                                    <X
                                                        className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100"
                                                        onClick={() => setProfile({ ...profile, skills: (profile.skills || []).filter((s: string) => s !== skill) })}
                                                    />
                                                </Badge>
                                            ))}
                                            <input
                                                id="skills"
                                                type="text"
                                                className="flex-1 bg-transparent outline-none min-w-[140px] text-sm"
                                                placeholder={(profile.skills || []).length ? 'Add another skill...' : 'React, Python, SQL...'}
                                                value={skillDraft}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setSkillDraft(value);
                                                    setIsSkillsOpen(true);
                                                    if (value.endsWith(',')) {
                                                        const newSkill = value.slice(0, -1).trim();
                                                        if (newSkill && !(profile.skills || []).includes(newSkill)) {
                                                            setProfile({ ...profile, skills: [...(profile.skills || []), newSkill] });
                                                        }
                                                        setSkillDraft('');
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const newSkill = skillDraft.trim();
                                                        if (newSkill && !(profile.skills || []).includes(newSkill)) {
                                                            setProfile({ ...profile, skills: [...(profile.skills || []), newSkill] });
                                                        }
                                                        setSkillDraft('');
                                                        setIsSkillsOpen(false);
                                                    } else if (e.key === 'Backspace' && !skillDraft && (profile.skills || []).length > 0) {
                                                        setProfile({ ...profile, skills: (profile.skills || []).slice(0, -1) });
                                                    }
                                                }}
                                                onFocus={() => setIsSkillsOpen(true)}
                                                onBlur={() => setTimeout(() => setIsSkillsOpen(false), 150)}
                                            />
                                        </div>

                                        {isSkillsOpen && (
                                            <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                                                {COMMON_SKILLS
                                                    .filter(s => s.toLowerCase().includes(skillDraft.toLowerCase()) && !(profile.skills || []).includes(s))
                                                    .map((skill) => (
                                                        <div
                                                            key={skill}
                                                            className="px-3 py-2 text-sm cursor-pointer hover:bg-muted text-popover-foreground"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                if (!(profile.skills || []).includes(skill)) {
                                                                    setProfile({ ...profile, skills: [...(profile.skills || []), skill] });
                                                                }
                                                                setSkillDraft('');
                                                                setIsSkillsOpen(false);
                                                            }}
                                                        >
                                                            {skill}
                                                        </div>
                                                    ))}
                                                {skillDraft && !COMMON_SKILLS.some(s => s.toLowerCase() === skillDraft.trim().toLowerCase()) && (
                                                    <div
                                                        className="px-3 py-2 text-sm cursor-pointer hover:bg-muted text-primary font-medium"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            const newSkill = skillDraft.trim();
                                                            if (newSkill && !(profile.skills || []).includes(newSkill)) {
                                                                setProfile({ ...profile, skills: [...(profile.skills || []), newSkill] });
                                                            }
                                                            setSkillDraft('');
                                                            setIsSkillsOpen(false);
                                                        }}
                                                    >
                                                        Add custom: &quot;{skillDraft.trim()}&quot;
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">Pick from dropdown or type and press Enter.</p>
                                </div>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="university">University / College</Label>
                                        <Input
                                            id="university"
                                            placeholder="Stanford University"
                                            value={profile.university || ''}
                                            onChange={(e) => setProfile({ ...profile, university: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="expected_graduation">Graduation Year</Label>
                                        <Input
                                            id="expected_graduation"
                                            type="number"
                                            placeholder="2025"
                                            value={profile.expected_graduation || ''}
                                            onChange={(e) => setProfile({ ...profile, expected_graduation: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="gender">Gender</Label>
                                        <select
                                            id="gender"
                                            className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                                            value={profile.gender || ''}
                                            onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                                        >
                                            <option value="">Select gender</option>
                                            <option value="female">Female</option>
                                            <option value="male">Male</option>
                                            <option value="non_binary">Non-binary</option>
                                            <option value="prefer_not_to_say">Prefer not to say</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="preferred_roles">Preferred Roles (Comma separated)</Label>
                                        <Input
                                            id="preferred_roles"
                                            placeholder="Frontend, ML, Data Science"
                                            value={profile.preferred_roles || ''}
                                            onChange={(e) => setProfile({ ...profile, preferred_roles: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <Label className="flex items-center gap-2">
                                            <MapPin size={14} className="text-primary" /> Location
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
                                </div>
                                <Button type="submit" className="w-full mt-6" disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Master Profile
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="glass bg-primary/5">
                        <CardHeader>
                            <CardTitle className="text-primary flex items-center gap-2">
                                <Sparkles className="h-5 w-5" /> AI Insight
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-sm">
                                {readinessScore !== null
                                    ? <>Your market readiness score is <strong>{readinessScore}/100</strong> based on your verified profile data.</>
                                    : 'No market readiness score yet. Upload your resume and add skills to generate one.'}
                            </p>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-4">
                                <div
                                    className="h-full bg-primary transition-all duration-1000"
                                    style={{ width: `${readinessScore ?? 0}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2">Keep your profile updated to improve this score.</p>
                        </CardContent>
                    </Card>

                    {/* Projects Section */}
                    <Card className="glass">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Portfolio Projects</CardTitle>
                            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                                <div className="grid gap-2">
                                    <Label className="text-[10px] uppercase font-bold">Project Name</Label>
                                    <Input
                                        placeholder="E-commerce AI Agent"
                                        value={projectInput.name}
                                        onChange={e => setProjectInput({ ...projectInput, name: e.target.value })}
                                        className="h-9 bg-background"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] uppercase font-bold">Description</Label>
                                    <Input
                                        placeholder="Built a RAG-based chatbot for customer support..."
                                        value={projectInput.description}
                                        onChange={e => setProjectInput({ ...projectInput, description: e.target.value })}
                                        className="h-9 bg-background"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] uppercase font-bold">Technologies (comma separated)</Label>
                                    <Input
                                        placeholder="Next.js, OpenAI, Pinecone"
                                        value={projectInput.technologies}
                                        onChange={e => setProjectInput({ ...projectInput, technologies: e.target.value })}
                                        className="h-9 bg-background"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] uppercase font-bold">Project Link (Optional)</Label>
                                    <Input
                                        placeholder="https://github.com/... or https://live-demo.com"
                                        value={projectInput.link}
                                        onChange={e => setProjectInput({ ...projectInput, link: e.target.value })}
                                        className="h-9 bg-background"
                                    />
                                </div>
                                <Button onClick={handleAddProject} size="sm" className="w-full h-9 font-bold">
                                    Add Project to AI Profile
                                </Button>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {(profile.projects || []).map((project: any, index: number) => (
                                    <div key={index} className="group relative p-4 rounded-xl border border-border bg-card/50 hover:border-primary/50 transition-all">
                                        <button
                                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleRemoveProject(index)}
                                            title="Remove project"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                        <div className="flex items-center gap-2 pr-6">
                                            <h4 className="font-bold text-sm">{project.name}</h4>
                                            {project.link && (
                                                <a
                                                    href={project.link.startsWith('http') ? project.link : `https://${project.link}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:text-primary/80 transition-colors"
                                                    title="View Project"
                                                >
                                                    <LinkIcon className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {project.technologies?.map((tech: string) => (
                                                <Badge key={tech} variant="secondary" className="px-1.5 py-0 text-[9px] font-medium bg-primary/5 text-primary border-none">
                                                    {tech}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    );
}
