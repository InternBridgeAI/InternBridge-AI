'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Mail, Lock, User, Building2, Phone } from 'lucide-react';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (!agreedToTerms) {
            setError('Please accept the Terms & Privacy Policy to continue.');
            return;
        }

        setLoading(true);

        const supabase = createClient();
        const { data, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.fullName,
                    phone: formData.phone,
                    password_ready: true,
                },
                emailRedirectTo: typeof window !== 'undefined'
                    ? `${window.location.origin}/auth/callback`
                    : undefined,
            },
        });

        if (authError) {
            console.error('Registration error details:', authError);
            if (authError.message.toLowerCase().includes('already registered') || authError.status === 422) {
                setError('This email is already in use. Please try logging in or use a different email.');
            } else if (authError.message.toLowerCase().includes('rate limit')) {
                setError('Email rate limit exceeded. Please wait a few minutes or increase your "Max Emails per Hour" in the Supabase Authentication Settings.');
            } else {
                setError(authError.message || 'An unexpected error occurred during registration.');
            }
            setLoading(false);
            return;
        }

        const isExistingUserResponse = Boolean(
            data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0
        );

        if (isExistingUserResponse) {
            setError('This email is already in use. Please sign in or reset your password instead.');
            setLoading(false);
            return;
        }

        if (typeof window !== 'undefined') {
            localStorage.setItem('pending_verification_email', formData.email);
            localStorage.setItem('pending_profile_full_name', formData.fullName);
            localStorage.setItem('pending_profile_phone', formData.phone);
            localStorage.removeItem('pending_registration_role');
        }

        router.push('/verify');
        setLoading(false);
    };

    const handleGoogleSignup = async () => {
        if (!agreedToTerms) {
            setError('Please accept the Terms & Privacy Policy to continue.');
            return;
        }

        setLoading(true);
        setError('');

        if (typeof window !== 'undefined') {
            localStorage.setItem('pending_profile_full_name', formData.fullName);
            localStorage.setItem('pending_profile_phone', formData.phone);
            localStorage.removeItem('pending_registration_role');
            localStorage.removeItem('pending_verification_email');
        }

        const supabase = createClient();
        const { error: googleError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?flow=google-signup`,
            },
        });

        if (googleError) {
            console.error('Google signup error:', googleError);
            setError(googleError.message || 'Unable to continue with Google right now.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left panel */}
            <div className="hidden lg:flex lg:w-[48%] bg-gradient-to-br from-brand-600 via-purple-600 to-brand-800 relative overflow-hidden xl:w-1/2">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
                <div className="absolute left-12 top-20 h-44 w-44 rounded-full bg-white/12 blur-3xl" />
                <div className="absolute right-8 bottom-10 h-60 w-60 rounded-full bg-fuchsia-300/15 blur-3xl" />
                <div className="relative z-10 flex w-full flex-col justify-center px-10 py-8 text-white xl:px-14">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Zap size={28} />
                        </div>
                        <span className="text-2xl font-bold">InternBridge AI</span>
                    </div>
                    <h2 className="max-w-xl text-4xl font-bold leading-tight xl:text-5xl">
                        Join the Future of<br />Internship Matching
                    </h2>
                    <p className="mt-4 max-w-xl text-lg text-white/80">
                        Create your account and let AI match you with the perfect internship opportunities.
                    </p>
                    <div className="mt-6 flex flex-1 items-center">
                        <img
                            src="/illustrations/mobile-login-animate.svg"
                            alt="Animated onboarding illustration"
                            className="pointer-events-none h-auto w-full max-w-[620px] max-h-[46vh] object-contain drop-shadow-[0_20px_44px_rgba(15,23,42,0.18)] xl:max-h-[50vh]"
                        />
                    </div>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center bg-background px-5 py-6 transition-colors duration-300 lg:px-8 lg:py-6">
                <div className="w-full max-w-lg">
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-lg gradient-brand flex items-center justify-center">
                            <Zap className="text-white" size={22} />
                        </div>
                        <span className="text-xl font-bold text-foreground">InternBridge AI</span>
                    </div>

                    <h1 className="text-2xl font-bold text-foreground mb-1">Create your account</h1>
                    <p className="text-muted-foreground mb-6">Get started with InternBridge AI</p>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                                label="Full Name"
                                name="fullName"
                                placeholder="John Doe"
                                value={formData.fullName}
                                onChange={handleChange}
                                icon={<User size={16} />}
                                required
                            />
                            <Input
                                label="Phone Number"
                                name="phone"
                                type="tel"
                                placeholder="+91 98765 43210"
                                value={formData.phone}
                                onChange={handleChange}
                                icon={<Phone size={16} />}
                                required
                            />
                        </div>
                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            icon={<Mail size={16} />}
                            required
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                                label="Password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                icon={<Lock size={16} />}
                                required
                            />
                            <Input
                                label="Confirm Password"
                                name="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                icon={<Lock size={16} />}
                                required
                            />
                        </div>

                        <label className="flex items-start gap-3 text-sm text-muted-foreground">
                            <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                            />
                            <span>
                                I agree to the Terms &amp; Privacy Policy
                            </span>
                        </label>

                        <Button type="submit" className="w-full" loading={loading} disabled={!agreedToTerms || loading}>
                            <Building2 size={16} className="mr-2" /> Create Account
                        </Button>
                    </form>

                    <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">OR</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="mt-3 space-y-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full bg-white text-black hover:bg-gray-50 border-gray-200 shadow-sm"
                            onClick={handleGoogleSignup}
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
                            Sign up with Google
                        </Button>

                        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                            If you continue with Google, we will ask you to set a password before role selection so you can also sign in with email and password later.
                        </div>
                    </div>

                    <p className="mt-4 text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link href="/login" className="text-primary font-medium hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
