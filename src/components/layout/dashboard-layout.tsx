'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';


interface DashboardLayoutProps {
    children: React.ReactNode;
    role: string;
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [userName, setUserName] = useState('');
    const [isChecking, setIsChecking] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const fetchUser = async () => {
            setIsChecking(true);
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, is_onboarded')
                    .eq('id', user.id)
                    .single();

                if (profile && profile.is_onboarded === false && !pathname.includes('/onboarding')) {
                    router.push('/onboarding');
                    return;
                }

                setUserName(profile?.full_name || user.email || 'User');
            } else if (!pathname.includes('/onboarding')) {
                router.push('/login');
            }
            setIsChecking(false);
        };
        fetchUser();
    }, [pathname, router]);

    if (isChecking) {
        return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="min-h-screen bg-background">
            <Sidebar role={role} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            <div className={cn('transition-all duration-300 min-h-screen flex flex-col', collapsed ? 'ml-[70px]' : 'ml-64')}>
                <Navbar userName={userName} userRole={role} />
                <main className="p-6 animate-fade-in flex-grow">
                    {children}
                </main>
            </div>
        </div>
    );
}
