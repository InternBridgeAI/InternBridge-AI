'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { GraduationCap, Clock, Award, Code2, ArrowRight, CheckCircle, Brain, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';

export default function TasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const result = await apiFetch('/api/tasks');
            if (result.success) {
                setTasks(result.data);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to load tasks');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Micro-Task Challenges</h1>
                    <p className="text-muted-foreground mt-2">Solve real problems from companies to earn interview invites and certificates.</p>
                </div>
                <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                    <Award className="h-5 w-5 text-primary" />
                    <span className="text-sm font-bold text-primary">Points: 1,450 XP</span>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {isLoading ? (
                    [1, 2].map(i => <div key={i} className="h-64 rounded-xl bg-muted/50 animate-pulse" />)
                ) : tasks.length > 0 ? (
                    tasks.map((task) => (
                        <Card key={task.id} className="glass group overflow-hidden border-primary/10 hover:border-primary/40 transition-all">
                            <div className="h-1 bg-gradient-to-r from-primary/50 to-blue-500/50" />
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            <Code2 className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <CardTitle>{task.title}</CardTitle>
                                            <CardDescription>{task.company?.company_name}</CardDescription>
                                        </div>
                                    </div>
                                    <Badge className="bg-primary/10 text-primary border-primary/20">
                                        <Sparkles className="h-3 w-3 mr-1" /> Direct Interview Invite
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                                <div className="flex flex-wrap gap-2">
                                    {task.skills_tested?.map((skill: string) => (
                                        <Badge key={skill} variant="outline" className="text-[10px]">{skill}</Badge>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5" /> Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-primary font-medium">
                                        <CheckCircle className="h-3.5 w-3.5" /> 128 submissions
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/30 border-t border-border/50 py-3">
                                <Link href={`/student/tasks/${task.id}`} className={buttonVariants({ className: 'w-full' })}>
                                    Take Challenge <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="md:col-span-2 text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                        <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">No active tasks</h3>
                        <p className="text-muted-foreground">Check back later for new micro-internship challenges.</p>
                    </div>
                )}
            </div>

            {/* Gamification Sidebar/Section */}
            <Card className="glass border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
                <CardContent className="p-0 flex flex-col md:flex-row items-center">
                    <div className="p-8 space-y-4 md:w-2/3">
                        <h3 className="text-2xl font-bold flex items-center gap-3">
                            <Sparkles className="h-6 w-6 text-primary" /> Why solve micro-tasks?
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                                <p className="text-sm">Verified badges are added to your profile for recruiters.</p>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                                <p className="text-sm">Bypass initial screening rounds with direct interview invites.</p>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                                <p className="text-sm">Earn reward points redeemable for course vouchers.</p>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                                <p className="text-sm">Real-world experience to showcase in your portfolio.</p>
                            </div>
                        </div>
                    </div>
                    <div className="hidden md:flex w-1/3 bg-primary/10 h-full items-center justify-center p-8">
                        <GraduationCap className="h-32 w-32 text-primary opacity-20" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
