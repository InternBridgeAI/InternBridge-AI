import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowRight, BadgeCheck, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBackendApiBaseUrl } from '@/lib/backend-api';

type VerifyResponse = {
    success: boolean;
    is_authentic: boolean;
    verification_method?: string;
    data?: {
        id: string;
        title: string;
        description?: string | null;
        issued_at?: string | null;
        certificate_url?: string | null;
        issuer?: { company_name?: string | null; full_name?: string | null };
        internship?: { title?: string | null };
        student?: { full_name?: string | null };
    };
};

async function getCertificate(certificateId: string): Promise<VerifyResponse> {
    const response = await fetch(
        `${getBackendApiBaseUrl()}/api/certificates/verify/${certificateId}`,
        { cache: 'no-store' }
    );

    if (response.status === 404) {
        notFound();
    }

    if (!response.ok) {
        throw new Error('Failed to load certificate');
    }

    return response.json();
}

export default async function CertificateVerificationPage({
    params,
}: {
    params: { certificateId: string };
}) {
    const { certificateId } = params;
    const verification = await getCertificate(certificateId);
    const certificate = verification.data;

    if (!certificate) {
        notFound();
    }

    const studentName = certificate.student?.full_name || 'Verified student';
    const issuerName = certificate.issuer?.company_name || certificate.issuer?.full_name || 'InternBridge partner';
    const internshipTitle = certificate.internship?.title || 'Internship program';
    const issuedDate = certificate.issued_at
        ? new Date(certificate.issued_at).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : 'Date unavailable';

    return (
        <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 px-4 py-12 sm:px-6">
            <div className="mx-auto max-w-4xl space-y-6">
                <div className="space-y-3 text-center">
                    <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.18em]">
                        Certificate Verification
                    </Badge>
                    <h1 className="text-3xl font-black tracking-tight sm:text-4xl">InternBridge Credential Check</h1>
                    <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                        This verification page confirms whether the certificate payload still matches the original digital fingerprint issued by InternBridge.
                    </p>
                </div>

                <Card className="border-primary/20 shadow-xl shadow-primary/5">
                    <CardHeader className="border-b border-border/60">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-2xl font-black tracking-tight">{certificate.title}</CardTitle>
                                <p className="mt-2 text-sm text-muted-foreground">{certificate.description || 'Certificate issued for verified internship completion.'}</p>
                            </div>
                            <Badge
                                className={verification.is_authentic ? 'bg-emerald-500/10 text-emerald-700 border-none dark:text-emerald-300' : 'bg-red-500/10 text-red-700 border-none dark:text-red-300'}
                            >
                                {verification.is_authentic ? <BadgeCheck className="mr-1.5 h-3.5 w-3.5" /> : <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />}
                                {verification.is_authentic ? 'Verified' : 'Verification failed'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Recipient</p>
                            <p className="mt-2 text-lg font-bold">{studentName}</p>
                            <p className="text-sm text-muted-foreground">Issued for {internshipTitle}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Issuer</p>
                            <p className="mt-2 text-lg font-bold">{issuerName}</p>
                            <p className="text-sm text-muted-foreground">Issued on {issuedDate}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Certificate ID</p>
                            <p className="mt-2 break-all font-mono text-sm">{certificate.id}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Verification Method</p>
                            <p className="mt-2 text-sm font-semibold capitalize">{(verification.verification_method || 'digital_fingerprint').replace(/_/g, ' ')}</p>
                            <p className="text-sm text-muted-foreground">The record is checked against the original issued payload.</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                    >
                        Return to InternBridge <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Public verification endpoint: <span className="font-mono">{certificate.certificate_url || `${getBackendApiBaseUrl()}/api/certificates/verify/${certificate.id}`}</span>
                </div>
            </div>
        </main>
    );
}
