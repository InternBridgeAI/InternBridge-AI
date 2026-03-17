import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function TPOLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardLayout role="tpo">{children}</DashboardLayout>;
}
