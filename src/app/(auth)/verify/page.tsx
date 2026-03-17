'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Mail, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';

export default function VerifyPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [otp, setOtp] = useState('');
    const [email, setEmail] = useState('');
    const router = useRouter();

    useEffect(() => {
        const storedEmail = typeof window !== 'undefined'
            ? localStorage.getItem('pending_verification_email') || ''
            : '';
        setEmail(storedEmail);
    }, []);

    const startCooldown = () => {
        setCooldown(60);
        const timer = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleResend = async () => {
        if (cooldown > 0) return;

        if (!email) {
            toast.error('Whose email should we send to? Please try registering again.');
            return;
        }
        if (typeof window !== 'undefined') {
            localStorage.setItem('pending_verification_email', email);
        }

        setIsLoading(true);
        const supabase = createClient();
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: {
                emailRedirectTo: typeof window !== 'undefined'
                    ? `${window.location.origin}/auth/callback`
                    : undefined,
            },
        });

        if (error) {
            if (error.message.toLowerCase().includes('rate limit')) {
                toast.error("Rate limit exceeded. Please wait a few minutes or increase 'Max Emails per Hour' in Supabase Settings.");
            } else {
                toast.error(error.message);
            }
        } else {
            toast.success('Verification OTP sent! Check your inbox.');
            startCooldown();
        }
        setIsLoading(false);
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast.error('Missing email. Please register again.');
            return;
        }
        if (typeof window !== 'undefined') {
            localStorage.setItem('pending_verification_email', email);
        }
        if (!otp.trim()) {
            toast.error('Please enter the OTP from your email.');
            return;
        }

        setIsLoading(true);
        const supabase = createClient();

        const otpTypes: Array<'email' | 'signup' | 'magiclink'> = ['email', 'signup', 'magiclink'];
        let verifyErrorMessage: string | null = null;
        let verified = false;

        for (const type of otpTypes) {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: otp.trim(),
                type,
            });
            if (!error) {
                verified = true;
                verifyErrorMessage = null;
                break;
            }
            verifyErrorMessage = error.message;
        }

        if (!verified) {
            toast.error(verifyErrorMessage || 'Invalid or expired OTP.');
            setIsLoading(false);
            return;
        }

        try {
            const pendingFullName = typeof window !== 'undefined' ? localStorage.getItem('pending_profile_full_name') : '';
            const pendingPhone = typeof window !== 'undefined' ? localStorage.getItem('pending_profile_phone') : '';

            await apiFetch('/api/auth/profile', {
                method: 'PATCH',
                body: JSON.stringify({
                    full_name: pendingFullName || undefined,
                    phone: pendingPhone || undefined,
                    role_selected: false,
                    is_onboarded: false,
                }),
            });
        } catch (error: any) {
            toast.error(error.message || 'Unable to update profile details.');
        }

        if (typeof window !== 'undefined') {
            localStorage.removeItem('pending_profile_full_name');
            localStorage.removeItem('pending_profile_phone');
            localStorage.removeItem('pending_verification_email');
        }

        router.push('/select-role');
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
            <div className="text-center max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/10">
                    <Mail className="text-primary" size={32} />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-3 tracking-tight">Verify your email</h1>
                <p className="text-muted-foreground mb-6">
                    Enter the 6-digit OTP sent to <span className="font-medium text-foreground">{email || 'your email'}</span>.
                </p>

                <form onSubmit={handleVerify} className="space-y-4 text-left">
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                        label="Email Verification OTP"
                        placeholder="6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                    />
                    <Button type="submit" className="w-full" loading={isLoading}>
                        <ShieldCheck size={16} className="mr-2" /> Verify & Continue
                    </Button>
                </form>

                <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 my-6 group transition-all hover:bg-primary/10 text-left">
                    <div className="flex items-center gap-2 text-primary">
                        <Zap size={16} className="group-hover:animate-pulse" />
                        <span className="text-sm font-bold uppercase tracking-widest text-[10px]">Tip: Check your spam folder</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleResend}
                        disabled={isLoading || cooldown > 0}
                        className="w-full flex items-center justify-center gap-2 h-10 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-black uppercase text-[10px] tracking-widest hover:opacity-90 disabled:opacity-50 transition-all border border-border"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : cooldown > 0 ? (
                            `Wait ${cooldown}s`
                        ) : (
                            <>
                                <RefreshCw className="h-3 w-3" /> Resend OTP
                            </>
                        )}
                    </button>

                    <Link
                        href="/login"
                        className="block text-muted-foreground font-black uppercase text-[10px] tracking-widest hover:text-primary transition-colors"
                    >
                        ← Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
}
