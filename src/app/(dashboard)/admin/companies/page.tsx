'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, CheckCircle, XCircle, ExternalLink, ShieldCheck, Mail, Globe, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const result = await apiFetch('/api/admin/users?role=company');
      if (result.success) {
        setCompanies(result.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load companies');
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (id: string, action: 'verify' | 'reject') => {
    setIsProcessing(id);
    try {
      const result = await apiFetch('/api/admin/verify', {
        method: 'POST',
        body: JSON.stringify({ profile_id: id, action, notes: `Manual admin review ${action}` }),
      });
      if (result.success) {
        toast.success(`Company ${action}ed successfully`);
        setCompanies(companies.map(c => c.id === id ? { ...c, is_verified: action === 'verify' } : c));
      }
    } catch (error: any) {
      toast.error(error.message || 'Operation failed');
    } finally {
      setIsProcessing(null);
    }
  };

  const filtered = companies.filter(c => (c.company_name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Company Verification</h1>
          <p className="text-muted-foreground mt-2">Vetting partners ensures platform trust and high-quality opportunities.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search company name..."
            className="pl-10 glass w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          [1, 2].map(i => <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />)
        ) : filtered.length > 0 ? (
          filtered.map((company) => (
            <Card key={company.id} className={`glass overflow-hidden border-l-4 transition-all ${company.is_verified ? 'border-l-green-500' : 'border-l-orange-500'}`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center text-muted-foreground border border-border/50">
                      <Building2 className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold">{company.company_name}</h3>
                        <Badge variant={company.is_verified ? 'success' : 'warning'}>
                          {company.is_verified ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {company.email}</span>
                        {company.company_website && (
                          <a
                            href={company.company_website.startsWith('http://') || company.company_website.startsWith('https://')
                              ? company.company_website
                              : `https://${company.company_website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-primary hover:underline"
                          >
                            <Globe className="h-3.5 w-3.5" /> {company.company_website} <ExternalLink className="h-2 w-2" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!company.is_verified ? (
                      <>
                        <Button
                          variant="outline"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleVerify(company.id, 'reject')}
                          disabled={isProcessing === company.id}
                        >
                          Reject
                        </Button>
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleVerify(company.id, 'verify')}
                          disabled={isProcessing === company.id}
                        >
                          {isProcessing === company.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShieldCheck className="h-4 w-4 mr-2" /> Verify Partner</>}
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleVerify(company.id, 'reject')}>Revoke Access</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold">No companies found</h3>
            <p className="text-muted-foreground">The verification queue is currently empty.</p>
          </div>
        )}
      </div>

      <Card className="glass border-indigo-200/50 bg-indigo-50/10 dark:bg-indigo-900/5 overflow-hidden">
        <CardContent className="p-8 flex items-start gap-6">
          <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-indigo-900 dark:text-indigo-400">Vetting Guidelines</h4>
            <p className="text-sm text-indigo-800/70 dark:text-indigo-300/60 mt-2 leading-relaxed">
              Before verifying a company, ensure they have a valid business email and professional website.
              Check for any previous fraud reports in the security logs.
              Verified partners can post unlimited internships and access AI-ranked candidate lists.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
