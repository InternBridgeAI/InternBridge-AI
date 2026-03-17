import { createClient } from './supabase/client';

async function getAccessToken() {
    const supabase = createClient();

    const {
        data: { session: currentSession },
    } = await supabase.auth.getSession();
    if (currentSession?.access_token) {
        return currentSession.access_token;
    }

    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed.session?.access_token ?? null;
}

async function parseAndThrow(response: Response): Promise<never> {
    let finalMessage = 'API request failed';
    try {
        const errorData = await response.json();

        if (typeof errorData.detail === 'string') {
            finalMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
            // FastAPI validation errors are an array of objects
            finalMessage = errorData.detail.map((err: any) => {
                const loc = err.loc?.join('.') || 'field';
                return `${loc}: ${err.msg}`;
            }).join(', ');
        } else if (errorData.error) {
            finalMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
        } else if (errorData.message) {
            finalMessage = typeof errorData.message === 'string' ? errorData.message : JSON.stringify(errorData.message);
        }
    } catch {
        // Fallback to text if JSON parse fails
        const text = await response.text().catch(() => '');
        finalMessage = text || response.statusText || finalMessage;
    }

    throw new Error(finalMessage);
}

/**
 * apiFetch wraps fetch and attaches Supabase JWT auth automatically.
 * It also retries once on 401 after a session refresh.
 */
export async function apiFetch(url: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);

    const accessToken = await getAccessToken();
    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    let response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
    });

    if (response.status === 401) {
        const refreshedToken = await getAccessToken();
        if (refreshedToken) {
            headers.set('Authorization', `Bearer ${refreshedToken}`);
            response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include',
            });
        }
    }

    if (!response.ok) {
        await parseAndThrow(response);
    }

    return response.json();
}
