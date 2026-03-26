'use client';

import { usePathname } from 'next/navigation';

export function SmallFooter() {
    const pathname = usePathname();

    // Hide small footer on landing page since it has a large footer
    if (pathname === '/') return null;

    return (
        <footer className="py-8 px-6 border-t border-border/40 text-center mt-auto">
            <p className="text-xs text-muted-foreground opacity-70">
                © {new Date().getFullYear()} InternBridge AI
            </p>
        </footer>
    );
}
