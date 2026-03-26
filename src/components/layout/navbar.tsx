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
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
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
                        <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
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
                    <div className="flex items-center gap-3 pr-2 border-r border-border">
                        <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold">
                            {getInitials(userName || 'U')}
                        </div>
                        <div className="hidden lg:block">
                            <p className="text-sm font-medium text-foreground leading-tight">{userName || 'User'}</p>
                            <p className="text-[11px] text-muted-foreground capitalize">{userRole}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Sign out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
}
