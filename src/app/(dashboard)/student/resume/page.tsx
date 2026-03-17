'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api-client';

export default function ResumePage() {
    const [resumeText, setResumeText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [parsedData, setParsedData] = useState<any>(null);

    const handleParse = async () => {
        if (!resumeText.trim()) {
            toast.error('Please paste your resume text');
            return;
        }

        setIsParsing(true);
        try {
            const result = await apiFetch('/api/ai/parse-resume', {
                method: 'POST',
                body: JSON.stringify({ resumeText }),
            });

            if (result.success) {
                setParsedData(result.data);
                toast.success('Resume parsed successfully!');
            } else {
                toast.error(result.error || 'Failed to parse resume');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold">Resume AI Engine</h1>
                <p className="text-muted-foreground mt-2">Paste your resume content to extract skills and generate your vector profile.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <Card className="glass">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" /> Input Resume
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder="Paste your resume text here (Ctrl+A, Ctrl+V from PDF)..."
                            className="min-h-[400px] font-mono text-xs leading-relaxed"
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full"
                            onClick={handleParse}
                            disabled={isParsing || !resumeText}
                        >
                            {isParsing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    AI is Thinking...
                                </>
                            ) : (
                                <>
                                    <Brain className="mr-2 h-4 w-4" />
                                    Parse with Gemini AI
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                <div className="space-y-6">
                    {parsedData ? (
                        <Card className="glass border-primary/20 bg-primary/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" /> Parsed Successfully
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Detected Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {parsedData.skills.map((skill: string) => (
                                            <Badge key={skill} variant="secondary">{skill}</Badge>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Experience</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {Array.isArray(parsedData.experience) && parsedData.experience.length > 0
                                            ? parsedData.experience
                                                .map((exp: any) =>
                                                    typeof exp === 'string'
                                                        ? exp
                                                        : [exp?.role, exp?.company].filter(Boolean).join(' @ ')
                                                )
                                                .filter(Boolean)
                                                .join(', ')
                                            : 'No specific experience found'}
                                    </p>
                                </div>

                                <div className="bg-white/50 dark:bg-black/50 p-4 rounded-lg border border-border/50">
                                    <p className="text-xs font-mono text-primary italic">"Skill vector generated and updated in system for real-time matching."</p>
                                </div>

                                <Button className="w-full" variant="outline" asChild>
                                    <a href="/student/internships">View Matched Internships</a>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="glass border-dashed border-2 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Brain className="h-8 w-8" />
                            </div>
                            <h3 className="font-semibold text-foreground">No Data Extracted</h3>
                            <p className="mt-2 text-sm max-w-[200px]">Paste your resume and click parse to see AI results here.</p>
                        </Card>
                    )}

                    <Card className="glass">
                        <CardHeader>
                            <CardTitle className="text-sm">Why AI Parsing?</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-muted-foreground">
                            <div className="flex gap-3">
                                <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="h-3 w-3 text-primary" />
                                </div>
                                <p><strong>Vector Matching:</strong> We convert your profile into an AI vector for perfect matching.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="h-3 w-3 text-primary" />
                                </div>
                                <p><strong>Hidden Keywords:</strong> AI extracts semantic skills even if not explicitly typed.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="h-3 w-3 text-primary" />
                                </div>
                                <p><strong>Auto-fill:</strong> Keep your platform profile synced with your latest resume.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
