'use client';

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Legend
} from 'recharts';

interface RankingData {
    name: string;
    skillMatch: number;
    experience: number;
    githubScore: number;
}

interface CandidateRankingChartProps {
    data: RankingData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background/95 backdrop-blur-sm border border-border p-3 rounded-lg shadow-xl text-xs font-bold uppercase tracking-tight">
                <p className="text-primary mb-2 border-b border-border pb-1">{label}</p>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="flex justify-between gap-4">
                            <span style={{ color: entry.color }}>{entry.name}:</span>
                            <span className="text-foreground">{entry.value}%</span>
                        </p>
                    ))}
                    <p className="mt-2 pt-1 border-t border-border flex justify-between font-black text-primary">
                        <span>OVERALL:</span>
                        <span>{Math.round(payload.reduce((acc: number, curr: any) => acc + curr.value, 0) / 3)}%</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export function CandidateRankingChart({ data }: CandidateRankingChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs uppercase font-bold italic opacity-50">
                Awaiting Candidate Applications...
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.1} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <YAxis
                        hide
                        domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary)/0.05)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '20px' }} />
                    <Bar name="Skill Match" dataKey="skillMatch" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
                    <Bar name="Skill Depth" dataKey="experience" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 0, 0, 0]} />
                    <Bar name="GitHub Linked" dataKey="githubScore" stackId="a" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
