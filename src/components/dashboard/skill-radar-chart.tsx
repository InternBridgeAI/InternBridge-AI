'use client';

import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';
import { Brain, Sparkles } from 'lucide-react';

interface SkillData {
    subject: string;
    student: number;
    market: number;
    fullMark: number;
}

interface SkillRadarChartProps {
    data: SkillData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background/95 backdrop-blur-sm border border-border p-3 rounded-lg shadow-xl text-xs font-bold uppercase tracking-tight">
                <p className="text-primary mb-2 border-b border-border pb-1">{label}</p>
                <div className="space-y-1">
                    <p className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Your Level:</span>
                        <span className="text-foreground">{payload[0].value}%</span>
                    </p>
                    <p className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Market Demand:</span>
                        <span className="text-foreground">{payload[1].value}%</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export function SkillRadarChart({ data }: SkillRadarChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-4">
                <Brain className="h-8 w-8 text-muted-foreground/30 mb-2 animate-pulse-slow" />
                <p className="text-sm font-semibold text-muted-foreground">Insufficient Data for AI Analysis</p>
                <p className="text-xs text-muted-foreground/50 mt-1 max-w-[200px]">Add skills or upload a resume to generate your profile graph.</p>
            </div>
        );
    }

    if (data.length < 3) {
        return (
            <div className="h-full w-full flex flex-col justify-between py-2 space-y-4">
                <div className="space-y-4">
                    {data.map((item) => (
                        <div key={item.subject} className="space-y-2">
                            <div className="flex justify-between text-xs font-bold tracking-tight">
                                <span className="text-foreground uppercase">{item.subject}</span>
                                <span className="text-muted-foreground text-[10px]">{Math.max(item.student, item.market)}% Match Factor</span>
                            </div>
                            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                {/* Student level */}
                                <div 
                                    className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-500" 
                                    style={{ width: `${item.student}%` }}
                                />
                                {/* Market demand level */}
                                <div 
                                    className="absolute h-full w-1.5 bg-purple-500 rounded-full" 
                                    style={{ left: `calc(${item.market}% - 3px)` }}
                                    title={`Market Demand: ${item.market}%`}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Your Level: {item.student}%
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500" /> Market Demand: {item.market}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="rounded-2xl bg-muted/40 p-3 border border-border/50 text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground flex items-center justify-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-brand-500" /> Add 3+ skills to unlock full Radar Chart
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.1} />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={false}
                        axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Radar
                        name="Student"
                        dataKey="student"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.5}
                    />
                    <Radar
                        name="Market"
                        dataKey="market"
                        stroke="hsl(var(--blue-500))"
                        strokeDasharray="4 4"
                        fill="transparent"
                        fillOpacity={0}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
