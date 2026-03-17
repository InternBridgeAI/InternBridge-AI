import { LogOut, Bell, Search, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getInitials } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

interface NavbarProps {
    userName: string;
    userRole: string;
}

export function Navbar({ userName, userRole }: NavbarProps) {
    const router = useRouter();

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
            <div className="flex items-center justify-between h-16 px-6">
                <div className="flex items-center gap-4 flex-1">
                    {/* Go Back */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
                        title="Go back"
                    >
                        <ArrowLeft size={18} />
                    </Button>

                    {/* Search */}
                    <div className="relative flex-1 max-w-md hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full h-9 pl-10 pr-4 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2 sm:gap-4 ml-4">
                    <ThemeToggle />

                    {/* Notifications */}
                    <button className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                        <Bell size={20} />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                    </button>

                    {/* User */}
                    <div className="flex items-center gap-3 pr-2 border-r border-border">
                        <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold">
                            {getInitials(userName || 'U')}
                        </div>
                        <div className="hidden lg:block">
                            <p className="text-sm font-medium text-foreground leading-tight">{userName || 'User'}</p>
                            <p className="text-[11px] text-muted-foreground capitalize">{userRole}</p>
                        </div>
                    </div>

                    {/* Logout */}
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
