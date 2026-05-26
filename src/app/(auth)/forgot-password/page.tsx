'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email');
            return;
        }
        setLoading(true);
        setError('');

        const supabase = createClient();
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });

        if (resetError) {
            setError(resetError.message);
        } else {
            setSuccess(true);
            toast.success('Password reset link sent to your email!');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex">
            {/* Left panel */}
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
                        Secure Account<br />Recovery
                    </h2>
                    <p className="text-lg text-white/80 max-w-md">
                        Get back into your account quickly and securely to continue your internship journey.
                    </p>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md">
                    <h1 className="text-2xl font-bold text-foreground mb-2">Reset Password</h1>
                    <p className="text-muted-foreground mb-8">Enter your email to receive a reset link</p>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="p-4 bg-green-500/10 text-green-600 rounded-lg border border-green-500/20">
                                Check your email for the password reset link.
                            </div>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => router.push('/login')}
                            >
                                Return to Login
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-4">
                            <Input
                                label="Email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                icon={<Mail size={16} />}
                                required
                            />
                            <Button type="submit" className="w-full" loading={loading}>
                                Send Reset Link
                            </Button>
                        </form>
                    )}

                    {!success && (
                        <p className="mt-8 text-center text-sm text-muted-foreground">
                            Remember your password?{' '}
                            <Link href="/login" className="text-primary font-medium hover:underline">
                                Sign in
                            </Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
