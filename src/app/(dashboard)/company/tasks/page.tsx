'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Plus, Target, Users, Clock, Trash2, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export default function CompanyTasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [skills, setSkills] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        deadline: '',
    });

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

    const handleAddSkill = (e: any) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            e.preventDefault();
            const skill = e.target.value.trim();
            if (!skills.includes(skill)) setSkills([...skills, skill]);
            e.target.value = '';
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const result = await apiFetch('/api/tasks', {
                method: 'POST',
                body: JSON.stringify({ ...formData, skills_tested: skills }),
            });
            if (result.success) {
                toast.success('Micro-task created successfully!');
                setTasks([result.data, ...tasks]);
                setFormData({ title: '', description: '', deadline: '' });
                setSkills([]);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to create task');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            const result = await apiFetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
            });
            if (result.success) {
                setTasks(tasks.filter((task) => task.id !== taskId));
                toast.success('Challenge removed');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete task');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Micro-Task Challenges</h1>
                    <p className="text-muted-foreground mt-2">Filter top talent by setting specific skill-testing tasks.</p>
                </div>
                <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-lg border border-border/50">
                    <Target className="h-5 w-5 text-primary" />
                    <span className="text-sm font-bold">{tasks.length} Active Challenges</span>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Create Task Form */}
                <div className="md:col-span-1">
                    <Card className="glass sticky top-8">
                        <CardHeader>
                            <CardTitle>Create Challenge</CardTitle>
                            <CardDescription>Target specific skills with a hands-on task.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateTask} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="t-title">Task Title</Label>
                                    <Input
                                        id="t-title"
                                        placeholder="e.g. Build a REST API"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="t-desc">Brief Instructions</Label>
                                    <Textarea
                                        id="t-desc"
                                        placeholder="What should they build?"
                                        className="h-24"
                                        required
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Skills Tested</Label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {skills.map(s => (
                                            <Badge key={s} variant="secondary" className="flex items-center gap-1">
                                                {s} <X className="h-3 w-3 cursor-pointer" onClick={() => setSkills(skills.filter(sk => sk !== s))} />
                                            </Badge>
                                        ))}
                                    </div>
                                    <Input placeholder="Type skill + Enter" onKeyDown={handleAddSkill} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Submission Deadline</Label>
                                    <Input
                                        type="date"
                                        value={formData.deadline}
                                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    />
                                </div>
                                <Button className="w-full" disabled={isCreating}>
                                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Publish Task</>}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* List of Tasks */}
                <div className="md:col-span-2 space-y-6">
                    {isLoading ? (
                        [1, 2].map(i => <div key={i} className="h-48 rounded-xl bg-muted/50 animate-pulse" />)
                    ) : tasks.length > 0 ? (
                        tasks.map((task) => (
                            <Card key={task.id} className="glass hover:border-primary/30 transition-all group">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle>{task.title}</CardTitle>
                                            <div className="flex gap-2 mt-2">
                                                {task.skills_tested?.map((s: string) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDeleteTask(task.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                                    <div className="grid grid-cols-2 mt-6 gap-4">
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                            <Users className="h-4 w-4 text-primary" />
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Submissions</p>
                                                <p className="font-bold text-lg">{task.submission_count ?? 0}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                                            <Clock className="h-4 w-4 text-blue-500" />
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Expires</p>
                                                <p className="font-bold text-lg">{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'Never'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-muted/30 border-t border-border/50 py-3">
                                    <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                                        <Sparkles className="h-3 w-3 text-primary" /> Challenge is live for student discovery and company-owned management.
                                    </p>
                                </CardFooter>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
                            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-bold">No tasks published</h3>
                            <p className="text-muted-foreground">Publish a task to start filtering high-quality candidates through performance-based metrics.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
