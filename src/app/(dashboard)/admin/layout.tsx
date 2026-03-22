import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { requireDashboardAccess } from '@/lib/dashboard-auth';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const access = await requireDashboardAccess('admin');

    return (
        <DashboardLayout role="admin" userId={access.userId} userName={access.userName}>
            {children}
        </DashboardLayout>
    );
}
