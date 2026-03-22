'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

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
        <div className="min-h-screen bg-background">
            <Sidebar
                role={role}
                collapsed={collapsed}
                mobileOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
                onToggle={() => setCollapsed((current) => !current)}
            />
            <div className={cn('min-h-screen flex flex-col transition-[margin] duration-300', collapsed ? 'md:ml-[70px]' : 'md:ml-64')}>
                <Navbar userId={userId} userName={userName} userRole={role} onMenuClick={() => setMobileOpen(true)} />
                <main className="flex-grow p-4 sm:p-6 animate-fade-in">
                    {children}
                </main>
            </div>
        </div>
    );
}
