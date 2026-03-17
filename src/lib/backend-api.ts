const DEFAULT_BACKEND_API_BASE_URL = 'http://127.0.0.1:8000';

export function getBackendApiBaseUrl() {
    return (
        process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
        DEFAULT_BACKEND_API_BASE_URL
    );
}

export async function fetchBackendJson<T = any>(
    path: string,
    headers: Record<string, string>,
): Promise<T> {
    const response = await fetch(`${getBackendApiBaseUrl()}${path}`, {
        headers,
        cache: 'no-store',
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(json?.detail || json?.error || 'Backend request failed');
    }

    return json as T;
}
