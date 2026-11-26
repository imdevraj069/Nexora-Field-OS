import { useAuthStore } from '@/stores/useAuthStore';

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  user: { userId: string; email: string; fullName: string; isVerified: boolean };
  activeOrg: { org_id: string; role_id: string; shard_id: number; org_name: string };
}

let refreshInFlight: Promise<string | null> | null = null;
let interceptorInstalled = false;
let nativeFetch: typeof window.fetch | null = null;

export function isTokenExpiringSoon(token: string | null, bufferSeconds = 180): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload?.exp) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    return payload.exp - nowSec <= bufferSeconds;
  } catch {
    return false;
  }
}

export async function refreshAccessToken(overrideOrgId?: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (refreshInFlight && !overrideOrgId) return refreshInFlight;

  const { refreshToken, activeOrg, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) return null;

  const fetchFn = nativeFetch || window.fetch.bind(window);
  const targetOrgId = overrideOrgId ?? activeOrg?.org_id;
  refreshInFlight = (async () => {
    try {
      const resp = await fetchFn('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, orgId: targetOrgId }),
      });
      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) {
          logout();
        }
        return null;
      }
      const data = await resp.json();
      if (data?.accessToken) {
        setTokens(data.accessToken, data.refreshToken);
        return data.accessToken as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function installFetchAuthInterceptor() {
  if (typeof window === 'undefined' || interceptorInstalled) return;
  interceptorInstalled = true;
  nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const isProtectedApi =
      (url.startsWith('/api/v1/') || url.includes('/api/v1/')) &&
      !url.includes('/api/v1/auth/');

    if (!isProtectedApi || !nativeFetch) {
      return nativeFetch!(input, init);
    }

    const store = useAuthStore.getState();
    let currentToken = store.token;
    if (currentToken && isTokenExpiringSoon(currentToken, 120) && store.refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) currentToken = refreshed;
    }

    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (currentToken && headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }

    const firstResp = await nativeFetch(input, { ...init, headers });
    if (firstResp.status !== 401) {
      return firstResp;
    }

    const newToken = await refreshAccessToken();
    if (!newToken) {
      return firstResp;
    }

    const retryHeaders = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    retryHeaders.set('Authorization', `Bearer ${newToken}`);
    return nativeFetch(input, { ...init, headers: retryHeaders });
  };
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let effectiveToken = token;
  if (effectiveToken && isTokenExpiringSoon(effectiveToken, 120)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) effectiveToken = refreshed;
  }

  const headers = new Headers(options.headers);
  if (effectiveToken) headers.set('Authorization', `Bearer ${effectiveToken}`);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res = await fetch(path, { ...options, headers });
  if (res.status === 401 && effectiveToken && !path.includes('/api/v1/auth/')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.set('Authorization', `Bearer ${refreshed}`);
      res = await fetch(path, { ...options, headers });
    }
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || data.errors?.[0]?.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string,
): Promise<T> {
  const payload = await apiRequest<{ data?: T; errors?: Array<{ message: string }> }>(
    '/graphql',
    {
      method: 'POST',
      body: JSON.stringify({ query, variables }),
    },
    token,
  );
  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message);
  }
  return payload.data as T;
}
