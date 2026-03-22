import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types';

type DashboardAccess = {
    userId: string;
    userName: string;
    role: UserRole;
};

export async function requireDashboardAccess(expectedRole: UserRole): Promise<DashboardAccess> {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, is_onboarded')
        .eq('id', session.user.id)
        .single();

    const actualRole = (profile?.role || session.user.user_metadata?.role || 'student') as UserRole;

    if (!profile) {
        redirect('/login');
    }

    if (actualRole !== expectedRole) {
        redirect(`/${actualRole}`);
    }

    if (profile.is_onboarded === false) {
        redirect('/onboarding');
    }

    return {
        userId: session.user.id,
        userName: profile.full_name || session.user.email || 'User',
        role: actualRole,
    };
}
