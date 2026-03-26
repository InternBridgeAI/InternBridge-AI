'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, Menu, X, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PublicNavbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Features', href: '#features' },
        { label: 'How it Works', href: '#how-it-works' },
        { label: 'For You', href: '#roles' },
    ];

    return (
        <nav
            className={cn(
                'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6',
                scrolled
                    ? 'h-16 bg-background/80 backdrop-blur-md border-b border-border shadow-sm py-2'
                    : 'h-20 bg-transparent py-4'
            )}
        >
            <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
                        <Zap size={20} />
                    </div>
                    <span className="text-lg font-bold text-foreground tracking-tight">InternBridge AI</span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-7">
                    {navLinks.map((link) => (
                        <Link
                            key={link.label}
                            href={link.href}
                            className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider h-full flex items-center"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <ThemeToggle />

                    <div className="hidden sm:flex items-center gap-3 ml-1">
                        <Link href="/login">
                            <Button variant="ghost" className="text-xs font-bold uppercase tracking-wider">
                                Sign In
                            </Button>
                        </Link>
                        <Link href="/register">
                            <Button className="text-xs font-bold uppercase tracking-wider px-5 h-9 group">
                                Get Started
                                <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="absolute top-full left-0 right-0 bg-background border-b border-border p-6 shadow-xl md:hidden animate-in slide-in-from-top-4 duration-200">
                    <div className="flex flex-col gap-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <hr className="border-border" />
                        <div className="grid grid-cols-2 gap-4">
                            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                                <Button variant="secondary" className="w-full">Sign In</Button>
                            </Link>
                            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                                <Button className="w-full">Get Started</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
