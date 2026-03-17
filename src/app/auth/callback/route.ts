import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') || '/student'
    const roleParam = searchParams.get('role')

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Get session with full user data including linked identities
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                // --- Auto-save GitHub & LinkedIn data from real OAuth identity links ---
                const identities = session.user.identities || []

                // 1. GitHub
                const githubIdentity = identities.find(i => i.provider === 'github')
                if (githubIdentity) {
                    const githubUsername = githubIdentity.identity_data?.user_name
                    if (githubUsername) {
                        await supabase
                            .from('profiles')
                            .update({ github_username: githubUsername })
                            .eq('id', session.user.id)
                    }
                }

                // 2. LinkedIn
                const linkedinIdentity = identities.find(i => i.provider === 'linkedin_oidc')
                if (linkedinIdentity) {
                    const vanityName = linkedinIdentity.identity_data?.custom_elements?.vanityName
                        || linkedinIdentity.identity_data?.name?.replace(/\s+/g, '-')
                        || 'Connected-via-OAuth';

                    const linkedinUrl = linkedinIdentity.identity_data?.profileUrl
                        || `https://www.linkedin.com/in/${vanityName}`;

                    await supabase
                        .from('profiles')
                        .update({ linkedin_url: linkedinUrl })
                        .eq('id', session.user.id)
                }

                // Fetch user profile to check onboarding and role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, is_onboarded, role_selected')
                    .eq('id', session.user.id)
                    .single()

                // If explicit 'next' is provided (e.g. for reset-password), prioritize it
                if (searchParams.get('next')) {
                    return NextResponse.redirect(`${origin}${next}`)
                }

                if (!profile) {
                    const inferredRole = roleParam || session.user.user_metadata?.role || 'student';
                    const roleSelected = Boolean(roleParam || session.user.user_metadata?.role);

                    // Create profile if missing (first time OAuth login)
                    await supabase.from('profiles').upsert({
                        id: session.user.id,
                        email: session.user.email,
                        full_name: session.user.user_metadata?.full_name || '',
                        role: inferredRole,
                        role_selected: roleSelected,
                        is_onboarded: false
                    })

                    if (!roleSelected) {
                        return NextResponse.redirect(`${origin}/select-role`)
                    }

                    return NextResponse.redirect(`${origin}/onboarding?role=${inferredRole}`)
                }

                if (profile) {
                    if (!profile.is_onboarded) {
                        if (!profile.role_selected) {
                            return NextResponse.redirect(`${origin}/select-role`)
                        }
                        if (roleParam && roleParam !== profile.role) {
                            await supabase.from('profiles').update({ role: roleParam, role_selected: true }).eq('id', session.user.id)
                        }
                        const resolvedRole = roleParam || profile.role || 'student'
                        return NextResponse.redirect(`${origin}/onboarding?role=${resolvedRole}`)
                    }
                    const role = profile.role || 'student'
                    return NextResponse.redirect(`${origin}/${role}`)
                }
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}
