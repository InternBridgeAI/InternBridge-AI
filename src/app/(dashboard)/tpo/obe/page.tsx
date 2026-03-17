'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Link, Plus, Target, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export default function OBEPage() {
    const [mappings, setMappings] = useState<any[]>([]);
    const [internships, setInternships] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [newMapping, setNewMapping] = useState({
        internship_id: '',
        obe_outcome_code: '',
        description: '',
        attainment_level: 3.0
    });

    useEffect(() => {
        fetchMappings();
        fetchInternships();
    }, []);

    const fetchMappings = async () => {
        try {
            const res = await apiFetch('/api/tpo/obe');
            if (res.success && res.data) {
                setMappings(res.data);
            }
        } catch (error) {
            console.error('Failed to load mappings', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchInternships = async () => {
        try {
            const res = await apiFetch('/api/internships');
            if (res.success && res.data) {
                setInternships(res.data);
            }
        } catch (error) {
            console.error('Failed to load internships', error);
        }
    };

    const handleCreateMapping = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newMapping.internship_id || !newMapping.obe_outcome_code) {
            toast.error('Please fill the required fields');
            return;
        }

        try {
            const res = await apiFetch('/api/tpo/obe', {
                method: 'POST',
                body: JSON.stringify(newMapping)
            });

            if (res.success) {
                toast.success('OBE Mapping created successfully');
                setShowForm(false);
                fetchMappings();
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to create mapping');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">OBE Outcome Mappings</h1>
                    <p className="text-muted-foreground mt-2">Map internships and industry skills to NBA/NAAC outcome-based education metrics.</p>
                </div>
                <Button onClick={() => setShowForm(!showForm)} className="shrink-0">
                    <Plus className="h-4 w-4 mr-2" /> Add Mapping
                </Button>
            </div>

            {showForm && (
                <Card className="glass border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-lg">New OBE Mapping</CardTitle>
                        <CardDescription>Link an internship to specific outcome metrics.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateMapping} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Internship</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newMapping.internship_id}
                                        onChange={(e) => setNewMapping({ ...newMapping, internship_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select internship...</option>
                                        {internships.map(i => (
                                            <option key={i.id} value={i.id}>{i.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>OBE Outcome Code (e.g., PO1, PO2)</Label>
                                    <Input
                                        placeholder="Enter PO/PSO code"
                                        value={newMapping.obe_outcome_code}
                                        onChange={(e) => setNewMapping({ ...newMapping, obe_outcome_code: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description (Optional)</Label>
                                <Input
                                    placeholder="Explain how this internship maps to the outcome"
                                    value={newMapping.description}
                                    onChange={(e) => setNewMapping({ ...newMapping, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Target Attainment Level (1-3)</Label>
                                <Input
                                    type="number"
                                    min="1" max="3" step="0.1"
                                    value={newMapping.attainment_level}
                                    onChange={(e) => setNewMapping({ ...newMapping, attainment_level: parseFloat(e.target.value) })}
                                />
                            </div>

                            <Button type="submit">Save Mapping</Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-muted/50 animate-pulse" />)
                ) : mappings.length > 0 ? (
                    mappings.map(mapping => (
                        <Card key={mapping.id} className="glass group hover:border-primary/40 transition-colors">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                        <Target className="h-3 w-3 mr-1" />
                                        {mapping.obe_outcome_code}
                                    </Badge>
                                    <div className="flex items-center text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                                        <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                                        Level {mapping.attainment_level}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <h4 className="font-semibold line-clamp-1">
                                        {mapping.internships?.title || "Unknown Internship"}
                                    </h4>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {mapping.description || "No description provided."}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center bg-muted/20 border border-dashed rounded-xl">
                        <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <h3 className="text-lg font-medium">No OBE Mappings</h3>
                        <p className="text-sm text-muted-foreground">Start mapping internships to program outcomes.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
