'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const errorCode = new URLSearchParams(window.location.search).get('error');
        if (errorCode === 'google-signup-disabled') {
            setError('Create your account with email and password first. Google sign-in is only available for existing linked accounts.');
        } else if (errorCode === 'auth-code-error') {
            setError('We could not complete the sign-in request. Please try again.');
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const supabase = createClient();
        const { data, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        if (data.user) {
            const allowedRoles = new Set(['student', 'company', 'tpo', 'admin']);
            const normalizeRole = (role?: string | null) => (role && allowedRoles.has(role) ? role : null);

            const metadataRole = normalizeRole(data.user.user_metadata?.role);
            const localStorageRole = typeof window !== 'undefined'
                ? normalizeRole(localStorage.getItem('pending_registration_role'))
                : null;

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, is_onboarded, role_selected')
                .eq('id', data.user.id)
                .single();

            const profileRole = normalizeRole(profile?.role);
            const desiredRole = metadataRole || localStorageRole || profileRole || 'student';
            const roleSelected = profile?.role_selected ?? Boolean(metadataRole || localStorageRole);

            if (!profile) {
                await supabase.from('profiles').upsert({
                    id: data.user.id,
                    email: data.user.email,
                    full_name: data.user.user_metadata?.full_name || '',
                    role: desiredRole,
                    is_onboarded: false,
                    role_selected: roleSelected,
                });
            } else if (profileRole !== desiredRole || (localStorageRole && !profile?.role_selected)) {
                await supabase.from('profiles').update({ role: desiredRole, role_selected: roleSelected }).eq('id', data.user.id);
            }

            if (!profile?.is_onboarded) {
                if (!roleSelected) {
                    router.push('/select-role');
                } else {
                    router.push(`/onboarding?role=${desiredRole}`);
                }
            } else {
                router.push(`/${desiredRole}`);
            }
        }
        setLoading(false);
    };

    const handleOTPLogin = async () => {
        if (!email) {
            setError('Please enter your email for OTP login');
            return;
        }
        setLoading(true);
        setError('');

        const supabase = createClient();
        const { error: otpError } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: false,
                emailRedirectTo: typeof window !== 'undefined'
                    ? `${window.location.origin}/auth/callback`
                    : undefined,
            },
        });

        if (otpError) {
            if (otpError.message.toLowerCase().includes('signups not allowed for otp')) {
                setError('No account was found for this email. Please sign up with email and password first.');
            } else {
                setError(otpError.message);
            }
        } else {
            setError('');
            alert('Check your email for the magic link!');
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        const supabase = createClient();
        const { error: googleError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (googleError) {
            console.error('Google Auth error:', googleError);
            if (googleError.message.toLowerCase().includes('provider is not enabled')) {
                setError('Google Login is not yet enabled in the Supabase Dashboard. Please contact the administrator.');
            } else {
                setError(googleError.message);
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left panel – branding */}
            <div className="hidden lg:flex lg:w-1/2 gradient-brand relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
                <div className="relative z-10 flex flex-col justify-center px-16 text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Zap size={28} />
                        </div>
                        <span className="text-2xl font-bold">InternBridge AI</span>
                    </div>
                    <h2 className="text-4xl font-bold leading-tight mb-4">
                        Skill Verified<br />Internship Ecosystem
                    </h2>
                    <p className="text-lg text-white/80 max-w-md">
                        AI-powered matching, resume parsing, skill verification, and micro-internship opportunities — all in one platform.
                    </p>
                </div>
            </div>

            {/* Right panel – form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background transition-colors duration-300">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-lg gradient-brand flex items-center justify-center">
                            <Zap className="text-white" size={22} />
                        </div>
                        <span className="text-xl font-bold text-foreground">InternBridge AI</span>
                    </div>

                    <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back</h1>
                    <p className="text-muted-foreground mb-8">Sign in to your account to continue</p>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <Input
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            icon={<Mail size={16} />}
                            required
                        />
                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            icon={<Lock size={16} />}
                            required
                        />

                        <Button type="submit" className="w-full" loading={loading}>
                            Sign In
                        </Button>
                    </form>

                    <div className="mt-4 flex items-center gap-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">OR</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="mt-4 space-y-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full bg-white text-black hover:bg-gray-50 border-gray-200 shadow-sm"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Continue with Google
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={handleOTPLogin}
                            disabled={loading}
                        >
                            <Mail size={16} className="mr-2" /> Continue with Email Link
                        </Button>
                    </div>

                    <p className="mt-8 text-center text-sm text-muted-foreground">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-primary font-medium hover:underline">
                            Sign up
                        </Link>
                    </p>
                    <p className="mt-2 text-center text-sm text-muted-foreground">
                        <Link href="/forgot-password" className="text-primary font-medium hover:underline">
                            Forgot Password?
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
