import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { requireDashboardAccess } from '@/lib/dashboard-auth';

export default async function TPOLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const access = await requireDashboardAccess('tpo');

    return (
        <DashboardLayout role="tpo" userId={access.userId} userName={access.userName}>
            {children}
        </DashboardLayout>
    );
}
