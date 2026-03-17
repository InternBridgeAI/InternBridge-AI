'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    FileSpreadsheet,
    Download,
    PieChart,
    TrendingUp,
    Users,
    Building2,
    Clock,
    ArrowRight,
    Loader2,
    Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export default function TPOReportsPage() {
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [summaryData, setSummaryData] = useState({ total_placements: 0, avg_stipend: 0 });
    const [skillGaps, setSkillGaps] = useState<any[]>([]);

    useEffect(() => {
        fetchReportsData();
    }, []);

    const fetchReportsData = async () => {
        try {
            const masterRes = await apiFetch('/api/tpo/reports/master');
            if (masterRes.success && masterRes.summary) {
                setSummaryData(masterRes.summary);
            }

            const gapRes = await apiFetch('/api/tpo/reports/skill-gap');
            if (gapRes.success && gapRes.data) {
                setSkillGaps(gapRes.data);
            }
        } catch (error) {
            console.error('Failed to prepare reports data', error);
        }
    };

    const handleGenerateMaster = async () => {
        setIsGenerating('master');
        try {
            const res = await apiFetch('/api/tpo/reports/master');
            if (res.success && res.data) {
                const csvData = res.data;
                const headers = ['Application ID', 'Student Name', 'Email', 'College', 'Company', 'Role', 'Type', 'Stipend', 'Placed Date'];
                const csvContent = [
                    headers.join(','),
                    ...csvData.map((row: any) => [
                        row.application_id,
                        `"${row.student_name || ''}"`,
                        row.student_email,
                        `"${row.college || ''}"`,
                        `"${row.company_name || ''}"`,
                        `"${row.role || ''}"`,
                        row.type,
                        row.stipend,
                        new Date(row.placed_date).toLocaleDateString()
                    ].join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `Placement_Master_Report_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Master report downloaded successfully!');
            }
        } catch (error) {
            toast.error('Failed to generate report');
        } finally {
            setIsGenerating(null);
        }
    };

    const handleGenerateGap = async () => {
        setIsGenerating('gap');
        try {
            const res = await apiFetch('/api/tpo/reports/skill-gap');
            if (res.success && res.data) {
                const csvData = res.data;
                const headers = ['Skill', 'Deficiency Count', 'Gap %'];
                const csvContent = [
                    headers.join(','),
                    ...csvData.map((row: any) => [
                        `"${row.skill}"`,
                        row.count,
                        row.gap_percentage
                    ].join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `Skill_Gap_Report_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Skill gap report downloaded successfully!');
            }
        } catch (error) {
            toast.error('Failed to generate report');
        } finally {
            setIsGenerating(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold">Reports & Analytics</h1>
                <p className="text-muted-foreground mt-2">Generate comprehensive placement reports and performance data exports.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Main Report Card */}
                <Card className="glass border-primary/20 bg-primary/5">
                    <CardHeader>
                        <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white mb-4">
                            <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <CardTitle>Placement Master Report</CardTitle>
                        <CardDescription>Comprehensive CSV export of all student statuses, companies, and stipends for the current batch.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-white/50 dark:bg-black/40 border border-primary/10">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Placements</p>
                                <p className="text-xl font-bold">{summaryData.total_placements}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-white/50 dark:bg-black/40 border border-primary/10">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Avg Stipend</p>
                                <p className="text-xl font-bold">₹{summaryData.avg_stipend.toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleGenerateMaster} disabled={isGenerating === 'master'}>
                            {isGenerating === 'master' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <><Download className="h-4 w-4 mr-2" /> Export to CSV</>}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Skill Deficiency Report */}
                <Card className="glass">
                    <CardHeader>
                        <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 mb-4">
                            <PieChart className="h-6 w-6" />
                        </div>
                        <CardTitle>Skill Gap Analysis</CardTitle>
                        <CardDescription>Report identifying high-demand skills that are missing from the current batch's skill vectors.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Critical Gaps Detected:</p>
                        <div className="flex flex-wrap gap-2">
                            {skillGaps.slice(0, 5).map(gap => (
                                <Badge key={gap.skill} variant="outline" className="border-red-200 text-red-600">
                                    {gap.skill} ({gap.gap_percentage}% Gap)
                                </Badge>
                            ))}
                            {skillGaps.length === 0 && (
                                <p className="text-sm text-muted-foreground">No significant skill gaps detected yet.</p>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full border-purple-200 hover:bg-purple-50" onClick={handleGenerateGap} disabled={isGenerating === 'gap'}>
                            {isGenerating === 'gap' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <><TrendingUp className="h-4 w-4 mr-2" /> View Full Analysis</>}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-bold">Historical Data</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    {[2023, 2022, 2021].map(year => (
                        <Card key={year} className="glass group hover:border-primary/30 transition-colors">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-bold">Batch of {year}</p>
                                        <p className="text-xs text-muted-foreground">Placement rate: {year === 2023 ? '88%' : '92%'}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="group-hover:text-primary"><Download className="h-4 w-4" /></Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
