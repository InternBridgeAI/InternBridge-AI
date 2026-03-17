import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentDashboardLoading() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div>
                <Skeleton className="h-9 w-64 mb-2" />
                <Skeleton className="h-5 w-80" />
            </div>

            {/* Top Stats Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="glass shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-3 w-24" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-7">
                {/* Main Section Skeleton */}
                <div className="md:col-span-4 space-y-6">
                    <Card className="glass placeholder:overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <Skeleton className="h-6 w-48 mb-2" />
                                <Skeleton className="h-4 w-56" />
                            </div>
                            <Skeleton className="h-8 w-24 rounded-md" />
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border/50">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex gap-4">
                                            <Skeleton className="h-12 w-12 rounded-lg" />
                                            <div>
                                                <Skeleton className="h-5 w-40 mb-2" />
                                                <Skeleton className="h-4 w-32 mb-3" />
                                                <div className="flex gap-2">
                                                    <Skeleton className="h-6 w-24 rounded-full" />
                                                    <Skeleton className="h-6 w-16 rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                        <Skeleton className="h-9 w-20 rounded-md" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <Skeleton className="h-6 w-48 mb-2" />
                            <Skeleton className="h-4 w-60" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <Skeleton className="h-4 w-32 mb-3" />
                                    <div className="space-y-3">
                                        {[...Array(2)].map((_, i) => (
                                            <Skeleton key={i} className="h-16 w-full rounded-lg" />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Skeleton className="h-4 w-40 mb-3" />
                                    <Skeleton className="h-16 w-full rounded-lg" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <Skeleton className="h-6 w-40" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Section Skeleton */}
                <div className="md:col-span-3 space-y-6">
                    <Card className="glass">
                        <CardHeader>
                            <Skeleton className="h-6 w-40" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Skeleton className="h-[250px] w-full rounded-full" />
                            <div className="space-y-4">
                                <Skeleton className="h-4 w-28" />
                                <div className="flex flex-wrap gap-2">
                                    {[...Array(3)].map((_, i) => (
                                        <Skeleton key={i} className="h-6 w-20 rounded-full" />
                                    ))}
                                </div>
                            </div>
                            <Skeleton className="h-9 w-full rounded-md mt-4" />
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <Skeleton className="h-6 w-40" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[...Array(2)].map((_, i) => (
                                <Skeleton key={i} className="h-20 w-full rounded-lg" />
                            ))}
                            <Skeleton className="h-9 w-full rounded-md" />
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <div className="bg-primary/10 p-6 rounded-lg">
                            <Skeleton className="h-6 w-32 mb-2" />
                            <Skeleton className="h-10 w-full mb-4" />
                            <Skeleton className="h-9 w-full rounded-md" />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
