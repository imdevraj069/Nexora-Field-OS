export interface AuthSession {
  accessToken: string;
  user: { userId: string; email: string; fullName: string; isVerified: boolean };
  activeOrg: { org_id: string; role_id: string; shard_id: number; org_name: string };
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.errors?.[0]?.message || `Request failed (${res.status})`);
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
