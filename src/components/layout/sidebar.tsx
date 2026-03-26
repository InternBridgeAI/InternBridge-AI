'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    User,
    FileText,
    Briefcase,
    GraduationCap,
    Building2,
    Shield,
    Users,
    BarChart3,
    ListTodo,
    Award,
    AlertTriangle,
    ClipboardList,
    BookOpen,
    TrendingUp,
    ChevronLeft,
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
        { label: 'Dashboard', href: '/student', icon: <LayoutDashboard size={20} /> },
        { label: 'Profile', href: '/student/profile', icon: <User size={20} /> },
        { label: 'Resume', href: '/student/resume', icon: <FileText size={20} /> },
        { label: 'Internships', href: '/student/internships', icon: <Briefcase size={20} /> },
        { label: 'Applications', href: '/student/applications', icon: <ClipboardList size={20} /> },
        { label: 'Skills', href: '/student/skills', icon: <TrendingUp size={20} /> },
        { label: 'Micro Tasks', href: '/student/tasks', icon: <ListTodo size={20} /> },
    ],
    company: [
        { label: 'Dashboard', href: '/company', icon: <LayoutDashboard size={20} /> },
        { label: 'Post Internship', href: '/company/internships/new', icon: <Briefcase size={20} /> },
        { label: 'My Internships', href: '/company/internships', icon: <Building2 size={20} /> },
        { label: 'Candidates', href: '/company/candidates', icon: <Users size={20} /> },
        { label: 'Micro Tasks', href: '/company/tasks', icon: <ListTodo size={20} /> },
        { label: 'Certificates', href: '/company/certificates', icon: <Award size={20} /> },
    ],
    admin: [
        { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'Companies', href: '/admin/companies', icon: <Building2 size={20} /> },
        { label: 'Internships', href: '/admin/internships', icon: <Briefcase size={20} /> },
        { label: 'Users', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'Fraud Detection', href: '/admin/fraud', icon: <AlertTriangle size={20} /> },
        { label: 'Activity Logs', href: '/admin/logs', icon: <Shield size={20} /> },
    ],
    tpo: [
        { label: 'Dashboard', href: '/tpo', icon: <LayoutDashboard size={20} /> },
        { label: 'Students', href: '/tpo/students', icon: <GraduationCap size={20} /> },
        { label: 'Reports', href: '/tpo/reports', icon: <BarChart3 size={20} /> },
        { label: 'OBE Mappings', href: '/tpo/obe', icon: <BookOpen size={20} /> },
        { label: 'Skills Map', href: '/tpo/skills', icon: <FileText size={20} /> },
        { label: 'Approvals', href: '/tpo/approvals', icon: <ClipboardList size={20} /> },
    ],
};

const roleLabels: Record<string, string> = {
    student: 'Student Portal',
    company: 'Company Portal',
    admin: 'Admin Panel',
    tpo: 'TPO Dashboard',
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
                    className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={cn(
                    'fixed left-0 top-0 z-40 h-screen border-r border-border bg-background transition-all duration-300 flex flex-col',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full',
                    'w-72 md:translate-x-0',
                    collapsed ? 'md:w-[70px]' : 'md:w-64'
                )}
            >
                <div className="flex items-center gap-3 px-4 h-16 border-b border-border">
                    <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0">
                        <Zap className="text-white" size={20} />
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <h1 className="text-base font-bold text-foreground truncate">InternBridge</h1>
                            <p className="text-[10px] text-primary font-medium uppercase tracking-wider">
                                {roleLabels[role]}
                            </p>
                        </div>
                    )}
                    <button
                        type="button"
                        aria-label="Close navigation"
                        className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {items.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                                    isActive
                                        ? 'bg-primary/10 text-primary shadow-sm'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                                title={collapsed ? item.label : undefined}
                            >
                                <span className={cn(isActive && 'text-primary')}>{item.icon}</span>
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={onToggle}
                    className="hidden md:flex items-center justify-center h-12 border-t border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                    <ChevronLeft className={cn('transition-transform duration-300', collapsed && 'rotate-180')} size={18} />
                </button>
            </aside>
        </>
    );
}
