import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CompanyDashboardLoading() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Skeleton className="h-9 w-64 mb-2" />
                    <Skeleton className="h-5 w-96" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-40 rounded-md" />
                    <Skeleton className="h-10 w-40 rounded-md" />
                </div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="glass shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <Skeleton className="h-4 w-32" />
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
                {/* Main Content Area Skeleton */}
                <div className="md:col-span-4 space-y-6">
                    <Card className="glass">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <Skeleton className="h-6 w-40 mb-2" />
                                <Skeleton className="h-4 w-60" />
                            </div>
                            <Skeleton className="h-8 w-24 rounded-md" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card">
                                        <div className="flex items-center gap-4">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div>
                                                <Skeleton className="h-4 w-32 mb-2" />
                                                <Skeleton className="h-3 w-24" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="hidden sm:block space-y-2">
                                                <Skeleton className="h-3 w-12" />
                                                <Skeleton className="h-5 w-10" />
                                            </div>
                                            <Skeleton className="h-8 w-20 rounded-lg" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass">
                        <CardHeader>
                            <Skeleton className="h-6 w-40 mb-2" />
                            <Skeleton className="h-4 w-60" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[...Array(2)].map((_, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/50">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-4 w-4 rounded-full" />
                                            <div>
                                                <Skeleton className="h-4 w-32 mb-1" />
                                                <Skeleton className="h-3 w-24" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-5 w-20 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Skeleton */}
                <div className="md:col-span-3 space-y-6">
                    <Card className="glass">
                        <div className="p-6 space-y-4">
                            <Skeleton className="h-10 w-10 rounded-xl mb-4" />
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-10 w-full rounded-xl" />
                        </div>
                    </Card>
                    
                    <Card className="glass h-[350px]">
                        <CardHeader>
                            <Skeleton className="h-4 w-48" />
                        </CardHeader>
                        <CardContent className="h-[280px]">
                            <Skeleton className="h-full w-full rounded-xl" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
