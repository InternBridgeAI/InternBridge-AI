'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Users,
    Search,
    Filter,
    MoreVertical,
    Mail,
    Calendar,
    ShieldAlert,
    Ban,
    CheckCircle2,
    Github,
    Award,
    Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const result = await apiFetch('/api/admin/users');
            if (result.success) {
                setUsers(result.data);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    const filtered = users.filter(u =>
        (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <p className="text-muted-foreground mt-2">Manage student, company, and college administrator accounts.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Name or email..."
                            className="pl-10 glass w-64"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
                </div>
            </div>

            <Card className="glass overflow-hidden border-border/50">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 border-b border-border/50">
                                <tr>
                                    <th className="px-6 py-4 font-bold">User</th>
                                    <th className="px-6 py-4 font-bold">Role</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold">Joined</th>
                                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {isLoading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-5 w-32 bg-muted rounded" /></td>
                                            <td className="px-6 py-4"><div className="h-5 w-16 bg-muted rounded" /></td>
                                            <td className="px-6 py-4"><div className="h-5 w-16 bg-muted rounded" /></td>
                                            <td className="px-6 py-4"><div className="h-5 w-24 bg-muted rounded" /></td>
                                            <td className="px-6 py-4"></td>
                                        </tr>
                                    ))
                                ) : filtered.length > 0 ? (
                                    filtered.map((user) => (
                                        <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                        {user.full_name?.[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold truncate">{user.full_name}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="capitalize">{user.role}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.is_verified ? (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 flex items-center gap-1 w-fit">
                                                        <CheckCircle2 className="h-3 w-3" /> Active
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="warning" className="flex items-center gap-1 w-fit">
                                                        <Clock className="h-3 w-3" /> Pending
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground text-xs">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground italic">No users matching your criteria.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="glass">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Github className="h-4 w-4" /> GitHub Verified Students
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">842</div>
                        <p className="text-xs text-muted-foreground mt-1">62% of total students</p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-red-500" /> Flagged Profiles
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">24</div>
                        <p className="text-xs text-muted-foreground mt-1 text-red-500 font-medium">Require investigation</p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Award className="h-4 w-4 text-amber-500" /> Premium Companies
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-500">12</div>
                        <p className="text-xs text-muted-foreground mt-1">Strategic partners</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
