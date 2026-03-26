'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    Award,
    BarChart3,
    BookOpen,
    Briefcase,
    Building2,
    ChevronLeft,
    ClipboardList,
    FileText,
    GraduationCap,
    LayoutDashboard,
    ListTodo,
    Shield,
    TrendingUp,
    User,
    Users,
    X,
    Zap,
} from 'lucide-react';

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

const navigationMap: Record<string, NavItem[]> = {
    student: [
        { label: 'Dashboard', href: '/student', icon: <LayoutDashboard size={18} /> },
        { label: 'Profile', href: '/student/profile', icon: <User size={18} /> },
        { label: 'Resume', href: '/student/resume', icon: <FileText size={18} /> },
        { label: 'Internships', href: '/student/internships', icon: <Briefcase size={18} /> },
        { label: 'Applications', href: '/student/applications', icon: <ClipboardList size={18} /> },
        { label: 'Skills', href: '/student/skills', icon: <TrendingUp size={18} /> },
        { label: 'Micro Tasks', href: '/student/tasks', icon: <ListTodo size={18} /> },
    ],
    company: [
        { label: 'Dashboard', href: '/company', icon: <LayoutDashboard size={18} /> },
        { label: 'Post Internship', href: '/company/internships/new', icon: <Briefcase size={18} /> },
        { label: 'My Internships', href: '/company/internships', icon: <Building2 size={18} /> },
        { label: 'Candidates', href: '/company/candidates', icon: <Users size={18} /> },
        { label: 'Micro Tasks', href: '/company/tasks', icon: <ListTodo size={18} /> },
        { label: 'Certificates', href: '/company/certificates', icon: <Award size={18} /> },
    ],
    admin: [
        { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={18} /> },
        { label: 'Companies', href: '/admin/companies', icon: <Building2 size={18} /> },
        { label: 'Internships', href: '/admin/internships', icon: <Briefcase size={18} /> },
        { label: 'Users', href: '/admin/users', icon: <Users size={18} /> },
        { label: 'Fraud Detection', href: '/admin/fraud', icon: <AlertTriangle size={18} /> },
        { label: 'Activity Logs', href: '/admin/logs', icon: <Shield size={18} /> },
    ],
    tpo: [
        { label: 'Dashboard', href: '/tpo', icon: <LayoutDashboard size={18} /> },
        { label: 'Students', href: '/tpo/students', icon: <GraduationCap size={18} /> },
        { label: 'Reports', href: '/tpo/reports', icon: <BarChart3 size={18} /> },
        { label: 'OBE Mappings', href: '/tpo/obe', icon: <BookOpen size={18} /> },
        { label: 'Skills Map', href: '/tpo/skills', icon: <FileText size={18} /> },
        { label: 'Approvals', href: '/tpo/approvals', icon: <ClipboardList size={18} /> },
    ],
};

const roleLabels: Record<string, string> = {
    student: 'Student workspace',
    company: 'Company workspace',
    admin: 'Admin workspace',
    tpo: 'TPO workspace',
};

interface SidebarProps {
    role: string;
    collapsed?: boolean;
    mobileOpen?: boolean;
    onClose?: () => void;
    onToggle?: () => void;
}

export function Sidebar({ role, collapsed = false, mobileOpen = false, onClose, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const items = navigationMap[role] || [];

    return (
        <>
            {mobileOpen && (
                <button
                    type="button"
                    aria-label="Close navigation"
                    className="fixed inset-0 z-30 bg-slate-950/20 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={cn(
                    'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card shadow-sm transition-all duration-200',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full',
                    'w-72 md:translate-x-0',
                    collapsed ? 'md:w-[84px]' : 'md:w-[272px]'
                )}
            >
                <div className="flex h-[72px] items-center gap-3 border-b border-border px-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <Zap size={18} />
                    </div>
                    {!collapsed && (
                        <div className="min-w-0">
                            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">InternBridge</h1>
                            <p className="text-xs text-muted-foreground">{roleLabels[role]}</p>
                        </div>
                    )}
                    <button
                        type="button"
                        aria-label="Close navigation"
                        className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted md:hidden"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                    {items.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'border border-primary/15 bg-primary/10 text-foreground'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                                title={collapsed ? item.label : undefined}
                            >
                                <span className={cn('shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}>
                                    {item.icon}
                                </span>
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <button
                    type="button"
                    onClick={onToggle}
                    className="hidden h-12 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-muted md:flex"
                >
                    <ChevronLeft className={cn('transition-transform duration-200', collapsed && 'rotate-180')} size={18} />
                </button>
            </aside>
        </>
    );
}
