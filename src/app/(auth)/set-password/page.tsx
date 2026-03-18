'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, ShieldCheck, Zap } from 'lucide-react';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

function SetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [error, setError] = useState('');

    const nextPath = searchParams?.get('next') || '/select-role';

    useEffect(() => {
        const loadUser = async () => {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.replace('/login');
                return;
            }

            setEmail(user.email || '');

            if (user.user_metadata?.password_ready) {
                router.replace(nextPath);
                return;
            }

            setInitializing(false);
        };

        void loadUser();
    }, [nextPath, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);

        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setError('Your session expired. Please sign in again.');
            setLoading(false);
            return;
        }

        const { error: updateError } = await supabase.auth.updateUser({
            password,
            data: {
                ...user.user_metadata,
                password_ready: true,
            },
        });

        if (updateError) {
            setError(updateError.message || 'Unable to set your password right now.');
            setLoading(false);
            return;
        }

        const pendingFullName = typeof window !== 'undefined' ? localStorage.getItem('pending_profile_full_name') : '';
        const pendingPhone = typeof window !== 'undefined' ? localStorage.getItem('pending_profile_phone') : '';

        if (pendingFullName || pendingPhone) {
            try {
                await apiFetch('/api/auth/profile', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        full_name: pendingFullName || undefined,
                        phone: pendingPhone || undefined,
                    }),
                });
            } catch (profileError: any) {
                toast.error(profileError.message || 'Password saved, but we could not sync your profile details yet.');
            }
        }

        if (typeof window !== 'undefined') {
            localStorage.removeItem('pending_profile_full_name');
            localStorage.removeItem('pending_profile_phone');
            localStorage.removeItem('pending_verification_email');
        }

        toast.success('Password saved. You can now sign in with Google or with your email and password.');
        router.replace(nextPath);
        setLoading(false);
    };

    if (initializing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 text-muted-foreground">
                Loading your account...
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border/50 p-8">
                <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Zap size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Create your password</h1>
                        <p className="text-muted-foreground mt-2">
                            Your Google account is connected for <span className="font-medium text-foreground">{email || 'this account'}</span>.
                            Set a password once so you can also sign in with email and password.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        icon={<Lock size={16} />}
                        required
                    />
                    <Input
                        label="Confirm Password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        icon={<ShieldCheck size={16} />}
                        required
                    />

                    <Button type="submit" className="w-full mt-6" loading={loading}>
                        Save Password & Continue
                    </Button>
                </form>
            </div>
        </div>
    );
}

export default function SetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>}>
            <SetPasswordContent />
        </Suspense>
    );
}
