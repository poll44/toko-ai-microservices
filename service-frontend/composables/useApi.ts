import type { ApiResponse } from '~/types';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * Client tunggal ke service-gateway. Gateway yang menerjemahkan JWT
 * menjadi header x-user-id / x-user-role untuk domain service.
 *
 *   /api/catalog/*  -> service-catalog :4001
 *   /api/orders/*   -> service-order   :4002
 *   /api/tickets/*  -> service-ticket  :4003
 *   /api/agent/*    -> service-agent   :8000 (ADK api_server)
 */
export function useApi() {
  const config = useRuntimeConfig();
  const { token, logout } = useAuth();

  async function request<T>(
    path: string,
    opts: { method?: Method; body?: unknown; query?: Record<string, unknown> } = {}
  ): Promise<T> {
    try {
      return await $fetch<T>(path, {
        baseURL: config.public.apiBase,
        method: opts.method ?? 'GET',
        body: opts.body as Record<string, unknown> | undefined,
        query: opts.query,
        headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
      });
    } catch (err: any) {
      const status = err?.response?.status ?? err?.statusCode;
      // Token kedaluwarsa / JWT_SECRET berubah -> kembali jadi Guest
      if (status === 401 && token.value) logout();
      const msg = err?.data?.error || err?.data?.message || err?.message || 'Request gagal';
      throw new Error(status ? `${msg} (HTTP ${status})` : msg);
    }
  }

  /** Untuk endpoint domain yang selalu membungkus hasil dalam { data } */
  async function data<T>(path: string, opts?: Parameters<typeof request>[1]): Promise<T> {
    const res = await request<ApiResponse<T>>(path, opts);
    return res.data;
  }

  return { request, data };
}
