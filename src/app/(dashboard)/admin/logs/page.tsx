'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Search, Filter, HardDrive, User, Terminal, ArrowDown, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const result = await apiFetch('/api/admin/logs?limit=100');
            if (result.success) {
                setLogs(result.data || []);
            }
        } catch (error) {
            toast.error('Failed to load logs');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredLogs = logs.filter((log) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
            String(log.action || '').toLowerCase().includes(query) ||
            String(log.user?.full_name || '').toLowerCase().includes(query) ||
            JSON.stringify(log.details || {}).toLowerCase().includes(query)
        );
    });

    const getActionColor = (action: string) => {
        if (action.includes('fraud')) return 'bg-red-100 text-red-700 border-red-200';
        if (action.includes('approved') || action.includes('verified')) return 'bg-green-100 text-green-700 border-green-200';
        if (action.includes('error')) return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-blue-100 text-blue-700 border-blue-200';
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Audit & Activity Logs</h1>
                    <p className="text-muted-foreground mt-2">Historical record of all critical platform actions and security events.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search action or user..."
                            className="pl-10 glass w-64"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon"><HardDrive className="h-4 w-4" /></Button>
                </div>
            </div>

            <div className="grid gap-6">
                <Card className="glass border-border/50">
                    <CardHeader className="bg-muted/30 border-b border-border/50 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-sm">
                                <Terminal className="h-4 w-4 text-primary" /> System Output
                            </div>
                            <Badge variant="outline" className="text-[10px]">Real-time Feed</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/30">
                            {isLoading ? (
                                <div className="p-8 text-center animate-pulse text-muted-foreground">Streaming logs...</div>
                            ) : filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <div key={log.id} className="p-4 flex items-start justify-between hover:bg-muted/10 transition-colors font-mono text-[11px]">
                                        <div className="flex items-start gap-4">
                                            <span className="text-muted-foreground shrink-0">{new Date(log.created_at).toLocaleTimeString()}</span>
                                            <div className="space-y-1">
                                                <p className="flex items-center gap-2">
                                                    <Badge className={`h-4 text-[9px] uppercase tracking-tighter ${getActionColor(log.action)}`}>
                                                        {log.action}
                                                    </Badge>
                                                    <span className="text-foreground/80">{log.user?.full_name}</span>
                                                </p>
                                                <p className="text-muted-foreground">{JSON.stringify(log.details)}</p>
                                            </div>
                                        </div>
                                        <div className="hidden sm:flex items-center gap-1.5 opacity-40">
                                            <Activity className="h-3 w-3" />
                                            <span>127.0.0.1</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-muted-foreground italic">No logs detected.</div>
                            )}
                        </div>
                    </CardContent>
                    <div className="bg-muted/30 border-t border-border/50 py-3 px-6 text-center">
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-6">
                            Load older entries <ArrowDown className="ml-1 h-3 w-3" />
                        </Button>
                    </div>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 rounded-xl border border-border/50 bg-muted/20 text-center">
                    <p className="text-xl font-bold">1.4k</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Logs Today</p>
                </div>
                <div className="p-4 rounded-xl border border-border/50 bg-muted/20 text-center">
                    <p className="text-xl font-bold">3</p>
                    <p className="text-[10px] text-muted-foreground uppercase text-red-500">Security Incidents</p>
                </div>
                <div className="p-4 rounded-xl border border-border/50 bg-muted/20 text-center">
                    <p className="text-xl font-bold">98.2%</p>
                    <p className="text-[10px] text-muted-foreground uppercase">API Success Rate</p>
                </div>
                <div className="p-4 rounded-xl border border-border/50 bg-muted/20 text-center">
                    <p className="text-xl font-bold">24mb</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Log Size</p>
                </div>
            </div>
        </div>
    );
}
