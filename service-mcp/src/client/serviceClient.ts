const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';

export async function callService(
  url: string,
  options: {
    method?: string;
    role?: string;
    userId?: string;
    body?: unknown;
  } = {}
) {
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-api-key': INTERNAL_KEY,
      'x-user-role': options.role || 'ADMIN_SISTEM',
      'x-user-id': options.userId || '',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as any).error || `HTTP ${res.status}`);
  }
  return data;
}