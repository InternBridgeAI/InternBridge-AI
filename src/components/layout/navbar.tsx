'use client';

import { ArrowLeft, LogOut, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/client';
import { getInitials } from '@/lib/utils';
import { NotificationCenter } from './notification-center';

interface NavbarProps {
    userId: string;
    userName: string;
    userRole: string;
    onMenuClick?: () => void;
}

export function Navbar({ userId, userName, userRole, onMenuClick }: NavbarProps) {
    const router = useRouter();

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <header className="sticky top-0 z-30 border-b border-border bg-background">
            <div className="mx-auto flex h-[72px] w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMenuClick}
                        className="md:hidden"
                        title="Open navigation"
                    >
                        <Menu size={18} />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="hidden sm:inline-flex"
                        title="Go back"
                    >
                        <ArrowLeft size={18} />
                    </Button>

                    <div className="hidden min-w-0 items-center gap-3 md:flex">
                        <div className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold capitalize text-foreground">
                            {userRole}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                            Focused workspace for your daily actions.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <NotificationCenter userId={userId} />
                    <ThemeToggle />

                    <div className="hidden items-center gap-3 border-l border-border pl-3 sm:flex">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                            {getInitials(userName || 'U')}
                        </div>
                        <div className="hidden lg:block">
                            <p className="text-sm font-semibold text-foreground">{userName || 'User'}</p>
                            <p className="text-xs capitalize text-muted-foreground">{userRole}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Sign out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
}
