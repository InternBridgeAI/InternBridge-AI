import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import { Toaster } from 'sonner';

const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: 'InternBridge AI – Skill Verified Internship Ecosystem',
    description:
        'AI-powered internship portal that matches students to internships using resume parsing, vector similarity, skill gap analysis, and GitHub verification.',
    keywords: ['internship', 'AI', 'skill matching', 'resume parsing', 'career'],
};

import { ThemeProvider } from '@/components/theme-provider';

import { SmallFooter } from '@/components/layout/small-footer';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/30">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <main className="flex-grow">
                        {children}
                    </main>
                    <SmallFooter />
                    <Toaster position="top-right" richColors closeButton />
                </ThemeProvider>
            </body>
        </html>
    );
}
