import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { requireDashboardAccess } from '@/lib/dashboard-auth';

export default async function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const access = await requireDashboardAccess('student');

    return (
        <DashboardLayout role="student" userId={access.userId} userName={access.userName}>
            {children}
        </DashboardLayout>
    );
}
