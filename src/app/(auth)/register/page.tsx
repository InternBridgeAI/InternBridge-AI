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

    return (
        <div className="min-h-screen flex">
            {/* Left panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 via-purple-600 to-brand-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
                <div className="relative z-10 flex flex-col justify-center px-16 text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Zap size={28} />
                        </div>
                        <span className="text-2xl font-bold">InternBridge AI</span>
                    </div>
                    <h2 className="text-4xl font-bold leading-tight mb-4">
                        Join the Future of<br />Internship Matching
                    </h2>
                    <p className="text-lg text-white/80 max-w-md">
                        Create your account and let AI match you with the perfect internship opportunities.
                    </p>

                    <div className="mt-12 space-y-4">
                        {[
                            { icon: '🤖', text: 'AI-powered resume parsing & skill extraction' },
                            { icon: '🎯', text: 'Smart matching with cosine similarity' },
                            { icon: '✅', text: 'GitHub skill verification' },
                            { icon: '📊', text: 'Market readiness scoring' },
                        ].map((feature) => (
                            <div key={feature.text} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
                                <span className="text-xl">{feature.icon}</span>
                                <span className="text-sm">{feature.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background transition-colors duration-300">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-lg gradient-brand flex items-center justify-center">
                            <Zap className="text-white" size={22} />
                        </div>
                        <span className="text-xl font-bold text-foreground">InternBridge AI</span>
                    </div>

                    <h1 className="text-2xl font-bold text-foreground mb-2">Create your account</h1>
                    <p className="text-muted-foreground mb-8">Get started with InternBridge AI</p>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
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
                            label="Email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            icon={<Mail size={16} />}
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

                    <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                        New accounts must be created with your email and a password. Google sign-in is available only for existing linked accounts on the login page.
                    </div>

                    <p className="mt-6 text-center text-sm text-muted-foreground">
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
