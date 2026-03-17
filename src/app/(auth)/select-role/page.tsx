'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Building2, School, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ROLE_OPTIONS = [
    {
        value: 'student',
        label: 'Student',
        description: 'Apply to internships and build your profile.',
        icon: GraduationCap,
    },
    {
        value: 'company',
        label: 'Company',
        description: 'Post internships and hire verified talent.',
        icon: Building2,
    },
    {
        value: 'tpo',
        label: 'College / TPO',
        description: 'Manage campus placement workflows.',
        icon: School,
    },
];

export default function SelectRolePage() {
    const [selectedRole, setSelectedRole] = useState('student');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, is_onboarded, role_selected')
                .eq('id', session.user.id)
                .single();

            if (profile?.is_onboarded) {
                router.push(`/${profile.role || 'student'}`);
                return;
            }

            if (profile?.role_selected && profile.role) {
                router.push(`/onboarding?role=${profile.role}`);
                return;
            }

            if (profile?.role) {
                setSelectedRole(profile.role);
            }

            setIsLoading(false);
        };

        init();
    }, [router, supabase]);

    const handleContinue = async () => {
        setIsSaving(true);
        try {
            await apiFetch('/api/auth/profile', {
                method: 'PATCH',
                body: JSON.stringify({
                    role: selectedRole,
                    role_selected: true,
                    is_onboarded: false,
                }),
            });

            if (typeof window !== 'undefined') {
                localStorage.setItem('pending_registration_role', selectedRole);
            }

            router.push(`/onboarding?role=${selectedRole}`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to save role. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
            <Card className="w-full max-w-lg shadow-2xl glass border-primary/20">
                <CardHeader className="text-center space-y-3">
                    <CardTitle className="text-2xl font-black">Select Your Role</CardTitle>
                    <CardDescription>Choose how you&apos;ll use InternBridge AI.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {ROLE_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const isActive = selectedRole === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setSelectedRole(option.value)}
                                className={cn(
                                    'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                                    isActive ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-background hover:border-primary/40'
                                )}
                            >
                                <div className={cn(
                                    'h-10 w-10 rounded-lg flex items-center justify-center',
                                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                )}>
                                    <Icon size={20} />
                                </div>
                                <div>
                                    <p className="font-semibold">{option.label}</p>
                                    <p className="text-xs text-muted-foreground">{option.description}</p>
                                </div>
                            </button>
                        );
                    })}

                    <Button className="w-full font-bold uppercase tracking-widest" onClick={handleContinue} loading={isSaving}>
                        Continue
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
