'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Navbar } from './navbar';
import { Sidebar } from './sidebar';

interface DashboardLayoutProps {
    children: React.ReactNode;
    role: string;
    userId: string;
    userName: string;
}

export function DashboardLayout({ children, role, userId, userName }: DashboardLayoutProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    return (
        <div className="min-h-screen bg-muted/40">
            <Sidebar
                role={role}
                collapsed={collapsed}
                mobileOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
                onToggle={() => setCollapsed((current) => !current)}
            />
            <div className={cn('min-h-screen flex flex-col transition-[margin] duration-200', collapsed ? 'md:ml-[84px]' : 'md:ml-[272px]')}>
                <Navbar userId={userId} userName={userName} userRole={role} onMenuClick={() => setMobileOpen(true)} />
                <main className="flex-1 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
                    <div className="mx-auto w-full max-w-[1400px] space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
