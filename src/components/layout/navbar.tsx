'use client';

import { LogOut, ArrowLeft, Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getInitials } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
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
        <header className="sticky top-0 z-30 border-b border-border bg-background/95">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6">
                <div className="flex items-center gap-4 flex-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMenuClick}
                        className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground md:hidden"
                        title="Open navigation"
                    >
                        <Menu size={18} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="hidden rounded-full h-9 w-9 text-muted-foreground hover:text-foreground sm:inline-flex"
                        title="Go back"
                    >
                        <ArrowLeft size={18} />
                    </Button>

                    <div className="hidden md:flex items-center gap-3">
                        <div className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium capitalize text-foreground">
                            {userRole}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Focused workspace for your daily actions.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 ml-4">
                    <NotificationCenter userId={userId} />
                    <ThemeToggle />
                    <div className="flex items-center gap-3 border-r border-border pr-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-xs font-semibold text-primary">
                            {getInitials(userName || 'U')}
                        </div>
                        <div className="hidden lg:block">
                            <p className="text-sm font-medium text-foreground leading-tight">{userName || 'User'}</p>
                            <p className="text-[11px] text-muted-foreground capitalize">{userRole}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Sign out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
}
