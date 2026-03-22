import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { requireDashboardAccess } from '@/lib/dashboard-auth';

export default async function CompanyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const access = await requireDashboardAccess('company');

    return (
        <DashboardLayout role="company" userId={access.userId} userName={access.userName}>
            {children}
        </DashboardLayout>
    );
}
