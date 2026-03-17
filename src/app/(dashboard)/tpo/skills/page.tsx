import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Flame,
    TrendingUp,
    Brain,
    Target,
    CheckCircle,
    Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type SkillInsight = {
    name: string;
    proficiency: number;
    demand: number;
    gap: number;
};

export default async function TPOSkillsHeatmapPage() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) return null;

    const { data: students } = await supabase
        .from('profiles')
        .select('id, skills')
        .eq('role', 'student')
        .eq('college_id', session.user.id);

    const studentCount = students?.length || 0;
    const skillCounts = new Map<string, number>();

    (students || []).forEach((student: any) => {
        (student.skills || []).forEach((skill: string) => {
            const normalized = skill.trim();
            if (!normalized) return;
            skillCounts.set(normalized, (skillCounts.get(normalized) || 0) + 1);
        });
    });

    const topSkills = Array.from(skillCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    const { data: internships } = await supabase
        .from('internships')
        .select('required_skills');

    const demandCounts = new Map<string, number>();
    (internships || []).forEach((internship: any) => {
        (internship.required_skills || []).forEach((skill: string) => {
            const normalized = skill.trim();
            if (!normalized) return;
            demandCounts.set(normalized, (demandCounts.get(normalized) || 0) + 1);
        });
    });

    const maxDemand = Math.max(0, ...Array.from(demandCounts.values()));

    const skills: SkillInsight[] = topSkills.map(([name, count]) => {
        const proficiency = studentCount > 0 ? Math.round((count / studentCount) * 100) : 0;
        const demand = maxDemand > 0 ? Math.round(((demandCounts.get(name) || 0) / maxDemand) * 100) : 0;
        return {
            name,
            proficiency,
            demand,
            gap: demand - proficiency,
        };
    });

    const criticalSkill = skills.length > 0
        ? [...skills].sort((a, b) => b.gap - a.gap)[0]
        : null;
    const strongestSkill = skills.length > 0
        ? [...skills].sort((a, b) => b.proficiency - a.proficiency)[0]
        : null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Skill Deficiency Heatmap</h1>
                    <p className="text-muted-foreground mt-2">Real-time analysis comparing your student skills with live internship demand.</p>
                </div>
                <Button className="bg-primary text-white">
                    <Brain className="mr-2 h-4 w-4" /> Request Upskilling Workshop
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
                <Card className="glass md:col-span-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" /> Batch Capability Heatmap
                        </CardTitle>
                        <CardDescription>Demand vs proficiency for skills actually present in your student profiles.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {skills.length > 0 ? (
                            <div className="space-y-8 mt-4">
                                {skills.map((skill) => {
                                    const demandMarker = Math.min(100, Math.max(0, skill.demand));
                                    const trendUp = skill.demand > skill.proficiency;
                                    return (
                                        <div key={skill.name} className="space-y-2">
                                            <div className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold w-28">{skill.name}</span>
                                                    <Badge variant={trendUp ? 'success' : 'secondary'} className="text-[8px] h-4">
                                                        {trendUp ? <TrendingUp className="h-2.5 w-2.5 mr-1" /> : null} {skill.demand}% Demand
                                                    </Badge>
                                                </div>
                                                <span className="font-mono text-xs">{skill.proficiency}% Proficiency</span>
                                            </div>
                                            <div className="h-3 w-full bg-muted rounded-full relative overflow-hidden">
                                                <div className="absolute top-0 bottom-0 w-1 bg-red-400 z-10 opacity-60" style={{ left: `${demandMarker}%` }} />
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${skill.proficiency < 40 ? 'bg-red-500' : skill.proficiency < 70 ? 'bg-orange-500' : 'bg-green-500'}`}
                                                    style={{ width: `${Math.min(100, Math.max(0, skill.proficiency))}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-xs text-muted-foreground font-bold uppercase tracking-widest">
                                No skill data available yet
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="md:col-span-4 space-y-6">
                    <Card className="glass bg-red-50/20 dark:bg-red-900/5 border-red-200/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                                <Flame className="h-4 w-4" /> Critical Concern
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {criticalSkill && criticalSkill.gap > 0 ? (
                                <>
                                    <p className="text-xs font-medium">{criticalSkill.name}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Demand exceeds proficiency by {criticalSkill.gap}% for this skill.
                                    </p>
                                </>
                            ) : (
                                <p className="text-[11px] text-muted-foreground">No critical gaps detected yet.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="glass bg-green-50/20 dark:bg-green-900/5 border-green-200/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" /> Batch Strength
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {strongestSkill ? (
                                <>
                                    <p className="text-xs font-medium">{strongestSkill.name}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {strongestSkill.proficiency}% of students list this skill.
                                    </p>
                                </>
                            ) : (
                                <p className="text-[11px] text-muted-foreground">No strength insights yet.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="glass overflow-hidden border-indigo-200/50 bg-indigo-50/10 dark:bg-indigo-900/5">
                        <div className="p-6 space-y-3">
                            <h4 className="font-bold flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-indigo-500" /> Recommendation
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {criticalSkill
                                    ? `Prioritize workshops for ${criticalSkill.name} to close the demand gap.`
                                    : 'Encourage students to keep updating their skills for better insights.'}
                            </p>
                            <Button variant="link" className="text-xs p-0 h-auto font-bold text-indigo-600">Browse Trainers →</Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
