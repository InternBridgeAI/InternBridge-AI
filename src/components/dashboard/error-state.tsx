'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface DashboardErrorProps {
    message?: string;
}

export function DashboardError({ message }: DashboardErrorProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold">Dashboard Unavailable</h2>
            <p className="text-muted-foreground max-w-md">
                {message || "We encountered an error while loading your profile data. This could be due to an invalid session or a server connection issue."}
            </p>
            <div className="flex gap-4">
                <Button onClick={() => window.location.reload()}>Retry</Button>
                <Link href="/login" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                    Back to Login
                </Link>
            </div>
        </div>
    );
}
