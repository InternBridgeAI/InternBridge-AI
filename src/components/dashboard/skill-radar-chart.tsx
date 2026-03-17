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
            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs uppercase font-bold italic opacity-50">
                Insufficient Data for AI Analysis
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
