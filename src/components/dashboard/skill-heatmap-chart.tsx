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
    Cell
} from 'recharts';

interface HeatmapData {
    skill: string;
    proficiency: number;
    demand: number;
}

interface SkillHeatmapChartProps {
    data: HeatmapData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background/95 backdrop-blur-sm border border-border p-3 rounded-lg shadow-xl text-xs font-bold uppercase tracking-tight">
                <p className="text-primary mb-2 border-b border-border pb-1">{label}</p>
                <div className="space-y-1">
                    <p className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Proficiency:</span>
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

export function SkillHeatmapChart({ data }: SkillHeatmapChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs uppercase font-bold italic opacity-50">
                Analyzing Batch Data...
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.1} />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="skill"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary)/0.05)' }} />
                    <Bar dataKey="proficiency" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="demand" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
