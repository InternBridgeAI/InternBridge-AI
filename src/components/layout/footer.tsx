'use client';

import React from 'react';
import Link from 'next/link';
import { Zap, Github, Twitter, Linkedin, Mail } from 'lucide-react';

export function Footer() {
    const currentYear = new Date().getFullYear();

    const sections = [
        {
            title: 'Platform',
            links: [
                { label: 'Features', href: '#features' },
                { label: 'How it Works', href: '#how-it-works' },
                { label: 'For Students', href: '#roles' },
                { label: 'For Companies', href: '#roles' },
            ],
        },
        {
            title: 'Support',
            links: [
                { label: 'Help Center', href: '#' },
                { label: 'Documentation', href: '#' },
                { label: 'Contact Us', href: 'mailto:support@internbridge.ai' },
                { label: 'Community', href: '#' },
            ],
        },
        {
            title: 'Company',
            links: [
                { label: 'About Us', href: '#' },
                { label: 'Privacy Policy', href: '#' },
                { label: 'Terms of Service', href: '#' },
                { label: 'Cookie Policy', href: '#' },
            ],
        },
    ];

    return (
        <footer className="bg-card border-t border-border pt-12 pb-6 px-6 transition-colors duration-300">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
                    {/* Brand & Tagline */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center shadow-md shadow-primary/20">
                                <Zap className="text-white" size={18} />
                            </div>
                            <span className="text-lg font-bold text-foreground">InternBridge AI</span>
                        </div>
                        <p className="text-muted-foreground text-xs max-w-xs leading-relaxed opacity-80">
                            Connecting talent with AI-powered, skill-verified internship matching. Bridge the gap between education and career.
                        </p>
                        <div className="flex items-center gap-3">
                            <Link href="#" className="p-1.5 rounded-md bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                                <Github size={16} />
                            </Link>
                            <Link href="#" className="p-1.5 rounded-md bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                                <Twitter size={16} />
                            </Link>
                            <Link href="#" className="p-1.5 rounded-md bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
                                <Linkedin size={16} />
                            </Link>
                        </div>
                    </div>

                    {/* Links */}
                    {sections.map((section) => (
                        <div key={section.title} className="space-y-3">
                            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider opacity-70">{section.title}</h4>
                            <ul className="space-y-1.5">
                                {section.links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="text-xs text-muted-foreground hover:text-primary transition-colors inline-block"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom Bar */}
                <div className="pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-[11px] text-muted-foreground">
                        © {currentYear} InternBridge AI. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <p className="text-[11px] text-muted-foreground opacity-60">
                            Made with ❤️ by Piyush Lomte
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
