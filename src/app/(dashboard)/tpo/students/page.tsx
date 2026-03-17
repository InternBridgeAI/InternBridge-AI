'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    Filter,
    User,
    CheckCircle,
    Brain,
    ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';

export default function TPOStudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [availabilityPct, setAvailabilityPct] = useState(0);
    const [availabilityCount, setAvailabilityCount] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);
    const [avgReadiness, setAvgReadiness] = useState<number | null>(null);
    const [placedThisWeek, setPlacedThisWeek] = useState(0);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const [studentsRes, placementsRes] = await Promise.allSettled([
                apiFetch('/api/admin/users?role=student'),
                apiFetch('/api/tpo/reports/master'),
            ]);

            if (studentsRes.status === 'rejected') {
                throw studentsRes.reason;
            }

            const studentData = studentsRes.value?.success ? studentsRes.value.data : [];
            const placements = placementsRes.status === 'fulfilled' ? (placementsRes.value?.data || []) : [];
            if (placementsRes.status === 'rejected') {
                toast.error('Failed to load placement stats');
            }
            setStudents(studentData);

            const total = studentData.length;
            setTotalStudents(total);

            const readinessScores = studentData
                .map((student: any) => student.market_readiness_score)
                .filter((score: any) => typeof score === 'number');

            const avgScore = readinessScores.length > 0
                ? Math.round(readinessScores.reduce((sum: number, score: number) => sum + score, 0) / readinessScores.length)
                : null;
            setAvgReadiness(avgScore);

            const placedStudentIds = new Set(
                placements.map((placement: any) => placement.student_id).filter(Boolean)
            );
            const placedCount = placedStudentIds.size;
            const seekingCount = Math.max(total - placedCount, 0);
            const availability = total > 0 ? Math.round((seekingCount / total) * 100) : 0;
            setAvailabilityPct(availability);
            setAvailabilityCount(seekingCount);

            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const placedWeekCount = placements.filter((placement: any) => {
                if (!placement.placed_date) return false;
                const placedAt = new Date(placement.placed_date).getTime();
                return !Number.isNaN(placedAt) && placedAt >= weekAgo;
            }).length;
            setPlacedThisWeek(placedWeekCount);
        } catch (error: any) {
            toast.error(error.message || 'Failed to load students');
        } finally {
            setIsLoading(false);
        }
    };

    const filtered = students.filter(s =>
        (s.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Student Performance Tracking</h1>
                    <p className="text-muted-foreground mt-2">Monitor students in your college, track their performance, and manage placements.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name..."
                            className="pl-10 glass w-64"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
                </div>
            </div>

            <div className="grid gap-6">
                {isLoading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />)
                ) : filtered.length > 0 ? (
                    filtered.map((student) => (
                        <Card key={student.id} className="glass overflow-hidden hover:border-primary/20 transition-all">
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                    <div className="flex items-center gap-4 lg:w-1/4">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border-2 border-primary/20">
                                            {student.avatar_url ? (
                                                <img src={student.avatar_url} className="h-full w-full object-cover" />
                                            ) : student.full_name?.[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold truncate">{student.full_name}</h3>
                                            <p className="text-[11px] text-muted-foreground truncate font-mono">{student.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center gap-2 lg:w-1/4">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">AI Market Readiness</p>
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 flex-grow bg-muted rounded-full">
                                                <div
                                                    className="h-full bg-primary"
                                                    style={{
                                                        width: `${Math.min(100, Math.max(0, typeof student.market_readiness_score === 'number' ? Math.round(student.market_readiness_score) : 0))}%`
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold">
                                                {typeof student.market_readiness_score === 'number'
                                                    ? `${Math.round(student.market_readiness_score)}%`
                                                    : 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 lg:w-1/3">
                                        {student.skills?.slice(0, 4).map((skill: string) => (
                                            <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                                        ))}
                                        {student.skills?.length > 4 && (
                                            <span className="text-[10px] text-muted-foreground self-center">+{student.skills.length - 4}</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 lg:ml-auto">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/tpo/students/${student.id}`}>Details</Link>
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" asChild>
                                            <Link href={`/tpo/students/${student.id}/report`}><ArrowUpRight className="h-4 w-4" /></Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-bold">No students found</h3>
                        <p className="text-muted-foreground">Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="glass">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Batch Availability</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStudents > 0 ? `${availabilityPct}%` : 'N/A'}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {totalStudents > 0
                                ? `${availabilityCount} of ${totalStudents} students seeking internships`
                                : 'No students registered yet'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Brain className="h-4 w-4 text-purple-500" /> Avg. Readiness Score
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-500">{avgReadiness !== null ? `${avgReadiness}/100` : 'N/A'}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {avgReadiness !== null ? 'Based on student readiness scores' : 'No readiness scores yet'}
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" /> Placed This Week
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">{placedThisWeek}</div>
                        <p className="text-xs text-muted-foreground mt-1">Accepted offers in the last 7 days</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
