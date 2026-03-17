'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Lock, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

// This page depends on query params + localStorage, so it should not be statically prerendered.
export const dynamic = 'force-dynamic';

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        const paramEmail = searchParams?.get('email') || '';
        const storedEmail = typeof window !== 'undefined'
            ? localStorage.getItem('pending_reset_email') || ''
            : '';
        if (paramEmail || storedEmail) {
            setEmail(paramEmail || storedEmail);
        }
    }, [searchParams]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError('Please enter your email.');
            return;
        }

        if (!otp.trim()) {
            setError('Please enter the reset code from your email.');
            return;
        }

        if (typeof window !== 'undefined') {
            localStorage.setItem('pending_reset_email', email);
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        const supabase = createClient();
        const { error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token: otp.trim(),
            type: 'recovery',
        });

        if (verifyError) {
            setError(verifyError.message || 'Invalid or expired reset code.');
            setLoading(false);
            return;
        }

        const { error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) {
            setError(updateError.message);
        } else {
            toast.success('Password updated successfully!');
            if (typeof window !== 'undefined') {
                localStorage.removeItem('pending_reset_email');
            }
            router.push('/login');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border/50 p-8">
                <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Zap size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Set New Password</h2>
                        <p className="text-muted-foreground mt-2">Enter the reset code and choose a new password</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-4">
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={<Mail size={16} />}
                        required
                    />
                    <Input
                        label="Reset Code"
                        placeholder="6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        icon={<ShieldCheck size={16} />}
                        required
                    />
                    <Input
                        label="New Password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        icon={<Lock size={16} />}
                        required
                    />
                    <Input
                        label="Confirm New Password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        icon={<Lock size={16} />}
                        required
                    />

                    <Button type="submit" className="w-full mt-6" loading={loading}>
                        Update Password
                    </Button>
                </form>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}
