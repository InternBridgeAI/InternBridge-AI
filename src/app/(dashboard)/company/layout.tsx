import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function CompanyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardLayout role="company">{children}</DashboardLayout>;
}
