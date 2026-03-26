'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Building2, GraduationCap, School } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = [
    {
        value: 'student',
        label: 'Student',
        description: 'Apply to internships, build your profile, and track your readiness.',
        icon: GraduationCap,
    },
    {
        value: 'company',
        label: 'Company',
        description: 'Post internships, review candidates, and manage hiring decisions.',
        icon: Building2,
    },
    {
        value: 'tpo',
        label: 'College / TPO',
        description: 'Manage placements, approvals, and student readiness at scale.',
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
            <div className="flex min-h-screen items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4 sm:p-6">
            <Card className="w-full max-w-3xl">
                <CardHeader className="space-y-3 text-center">
                    <CardTitle className="text-3xl font-semibold tracking-tight">Choose your workspace</CardTitle>
                    <CardDescription>
                        Pick the role that matches how you will use InternBridge. You can continue onboarding right after this step.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        {ROLE_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const isActive = selectedRole === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setSelectedRole(option.value)}
                                    className={cn(
                                        'rounded-2xl border bg-background p-5 text-left transition-colors',
                                        isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/25 hover:bg-muted/40'
                                    )}
                                >
                                    <div className={cn(
                                        'flex h-11 w-11 items-center justify-center rounded-xl',
                                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                    )}>
                                        <Icon size={20} />
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{option.label}</h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{option.description}</p>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            You can refine your details in the next onboarding step.
                        </p>
                        <Button onClick={handleContinue} loading={isSaving} className="min-w-[180px]">
                            Continue
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
