'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

export function PublicNavbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 12);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Features', href: '#features' },
        { label: 'How it works', href: '#how-it-works' },
        { label: 'Roles', href: '#roles' },
    ];

    return (
        <nav
            className={cn(
                'fixed left-0 right-0 top-0 z-50 border-b border-transparent bg-background/95 transition-colors duration-200',
                scrolled && 'border-border shadow-sm backdrop-blur-sm'
            )}
        >
            <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
                <Link href="/" className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <Zap size={18} />
                    </div>
                    <div>
                        <span className="block text-base font-semibold tracking-tight text-foreground">InternBridge</span>
                        <span className="block text-xs text-muted-foreground">AI internship platform</span>
                    </div>
                </Link>

                <div className="hidden items-center gap-8 md:flex">
                    {navLinks.map((link) => (
                        <Link
                            key={link.label}
                            href={link.href}
                            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <ThemeToggle />

                    <div className="hidden items-center gap-3 sm:flex">
                        <Link href="/login">
                            <Button variant="ghost">Sign in</Button>
                        </Link>
                        <Link href="/register">
                            <Button>Get started</Button>
                        </Link>
                    </div>

                    <button
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted md:hidden"
                        onClick={() => setMobileMenuOpen((open) => !open)}
                        aria-label="Toggle navigation"
                    >
                        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {mobileMenuOpen && (
                <div className="border-t border-border bg-background px-6 py-5 shadow-sm md:hidden">
                    <div className="flex flex-col gap-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="text-sm font-medium text-foreground"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                                <Button variant="outline" className="w-full">Sign in</Button>
                            </Link>
                            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                                <Button className="w-full">Get started</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
