import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Auth middleware: refreshes expired sessions and protects role-based routes.
 * Redirects unauthenticated users to /login.
 * Prevents access to role-specific dashboards without the matching role.
 */
export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request: { headers: request.headers } });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options });
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const pathname = request.nextUrl.pathname;

    // Public routes that don't require auth
    const publicRoutes = ['/', '/login', '/register', '/verify', '/forgot-password', '/reset-password', '/auth/callback'];
    const publicPrefixes = ['/api/auth', '/certificates/verify'];
    const isPublicRoute = publicRoutes.includes(pathname) || publicPrefixes.some((prefix) => pathname.startsWith(prefix));

    if (isPublicRoute) return response;

    // Redirect to login if not authenticated
    if (!user) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-based route protection
    const roleRoutes: Record<string, string> = {
        '/student': 'student',
        '/company': 'company',
        '/admin': 'admin',
        '/tpo': 'tpo',
    };

    for (const [routePrefix, requiredRole] of Object.entries(roleRoutes)) {
        if (pathname.startsWith(routePrefix)) {
            // Fetch user profile to check role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (!profile || profile.role !== requiredRole) {
                // Redirect to appropriate dashboard based on actual role
                // Fallback to metadata if profile is missing
                const actualRole = profile?.role || user.user_metadata?.role || 'student';

                // If the user's actual role doesn't match the route, redirect
                if (actualRole !== requiredRole) {
                    return NextResponse.redirect(new URL(`/${actualRole}`, request.url));
                }
            }
            break;
        }
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
