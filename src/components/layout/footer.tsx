'use client';

import React from 'react';
import Link from 'next/link';
import { Github, Linkedin, Mail, Zap } from 'lucide-react';

export function Footer() {
    const currentYear = new Date().getFullYear();

    const sections = [
        {
            title: 'Platform',
            links: [
                { label: 'Features', href: '#features' },
                { label: 'How it works', href: '#how-it-works' },
                { label: 'Students', href: '#roles' },
                { label: 'Companies', href: '#roles' },
            ],
        },
        {
            title: 'Support',
            links: [
                { label: 'Help center', href: '#' },
                { label: 'Documentation', href: '#' },
                { label: 'Contact', href: 'mailto:support@internbridge.ai' },
            ],
        },
        {
            title: 'Company',
            links: [
                { label: 'About', href: '#' },
                { label: 'Privacy', href: '#' },
                { label: 'Terms', href: '#' },
            ],
        },
    ];

    return (
        <footer className="border-t border-border bg-card px-6 py-12">
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr]">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <Zap size={18} />
                            </div>
                            <div>
                                <p className="text-base font-semibold tracking-tight text-foreground">InternBridge</p>
                                <p className="text-sm text-muted-foreground">AI internship platform</p>
                            </div>
                        </div>

                        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                            Verified matching for students, colleges, and companies with a product experience built for real hiring workflows.
                        </p>

                        <div className="flex items-center gap-3">
                            <Link href="#" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                <Github size={16} />
                            </Link>
                            <Link href="#" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                <Linkedin size={16} />
                            </Link>
                            <Link href="mailto:support@internbridge.ai" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                <Mail size={16} />
                            </Link>
                        </div>
                    </div>

                    {sections.map((section) => (
                        <div key={section.title} className="space-y-4">
                            <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
                            <ul className="space-y-3">
                                {section.links.map((link) => (
                                    <li key={link.label}>
                                        <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                    <p>© {currentYear} InternBridge. All rights reserved.</p>
                    <p>Built for real internship matching workflows.</p>
                </div>
            </div>
        </footer>
    );
}
