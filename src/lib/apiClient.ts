// TYPE-ONLY import — erased by the TypeScript compiler before webpack sees it.
// Zero runtime cost; safe to reference in files used by Client Components.
import type { SupabaseClient } from "@supabase/supabase-js";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const API_SECRET_KEY = process.env.NEXT_PUBLIC_API_SECRET_KEY || process.env.API_SECRET_KEY || "";

// ── Browser-side singleton ───────────────────────────────────────────────────
// Created once on the first client-side call, reused for the page lifetime.
// Always null on the server — the server never reaches this code path.
let _browserClient: SupabaseClient | null = null;

/**
 * Resolves an auth token for the CURRENT environment.
 *
 * Server: returns API_SECRET_KEY (or null).
 *   For authenticated SSR calls, callers pass the user token explicitly via
 *   the `token` argument on each api.* method — no server Supabase import here.
 *
 * Client: reads the live Supabase session from the cached browser client.
 */
const resolveToken = async (): Promise<string | null> => {
  // ── Server ────────────────────────────────────────────────────────────────
  // Token is injected explicitly by Server Components; fall back to secret key.
  if (typeof window === "undefined") {
    return API_SECRET_KEY || null;
  }

  // ── Client ────────────────────────────────────────────────────────────────
  try {
    if (!_browserClient) {
      const { createClient } = await import("@/lib/supabase/client");
      _browserClient = createClient();
    }
    const { data: { session } } = await _browserClient.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    _browserClient = null; // Reset so the next call re-initialises cleanly.
    return null;
  }
};

/**
 * Builds the full JSON headers map.
 * Pass `token` to inject an explicit Bearer value (used by SSR callers).
 * Omit it to fall through to resolveToken() (used by client-side callers).
 */
const getHeaders = async (token?: string): Promise<Record<string, string>> => {
  const resolved = token ?? (await resolveToken());
  return {
    "Content-Type": "application/json",
    ...(resolved ? { Authorization: `Bearer ${resolved}` } : {}),
  };
};

/**
 * Builds an auth-only header map (no Content-Type — used for multipart uploads).
 * Pass `token` to inject an explicit Bearer value.
 */
const getAuthHeader = async (token?: string): Promise<Record<string, string>> => {
  const resolved = token ?? (await resolveToken());
  return resolved ? { Authorization: `Bearer ${resolved}` } : {};
};

const handleResponse = async <T>(response: Response): Promise<{ data: T; status: number }> => {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorData = body as Record<string, unknown> | null;
    throw {
      response: { data: body, status: response.status },
      message:
        typeof errorData?.message === "string"
          ? errorData.message
          : `HTTP Error ${response.status}`,
    };
  }

  return { data: body as T, status: response.status };
};

/** Legacy client — returns the full JSON body as `data` (no unwrapping). */
export const apiClient = {
  async get<T>(
    url: string,
    config?: { params?: Record<string, unknown> }
  ): Promise<{ data: T; status: number }> {
    let queryString = "";
    if (config?.params) {
      const cleanParams: Record<string, string> = {};
      for (const [key, value] of Object.entries(config.params)) {
        if (value != null) cleanParams[key] = String(value);
      }
      queryString = "?" + new URLSearchParams(cleanParams).toString();
    }
    const response = await fetch(`${API_BASE_URL}${url}${queryString}`, {
      method: "GET",
      headers: await getHeaders(),
    });
    return handleResponse<T>(response);
  },

  async post<T>(url: string, body?: unknown): Promise<{ data: T; status: number }> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "POST",
      headers: await getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(url: string, body?: unknown): Promise<{ data: T; status: number }> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "PUT",
      headers: await getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(url: string, body?: unknown): Promise<{ data: T; status: number }> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "PATCH",
      headers: await getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(url: string): Promise<{ data: T; status: number }> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "DELETE",
      headers: await getHeaders(),
    });
    return handleResponse<T>(response);
  },
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

/**
 * Unified API client — automatically unwraps `body.data` from the response envelope.
 * Use this for all new service code.
 */
export const api = {
  /** GET — unwraps envelope `{ data: T }`. Pass `token` for SSR calls. */
  async get<T>(url: string, params?: Record<string, unknown>, token?: string): Promise<T> {
    let queryString = "";
    if (params) {
      const cleanParams: Record<string, string> = {};
      for (const [key, value] of Object.entries(params)) {
        if (value != null) cleanParams[key] = String(value);
      }
      queryString = "?" + new URLSearchParams(cleanParams).toString();
    }
    try {
      const response = await fetch(`${API_BASE_URL}${url}${queryString}`, {
        method: "GET",
        headers: await getHeaders(token),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as Record<string, unknown>;
        const errorMessage = typeof err?.message === "string"
          ? err.message
          : `HTTP ${response.status}`;
        throw { status: response.status, message: errorMessage, url };
      }
      const body = await response.json() as { data?: T };
      return (body.data ?? body) as T;
    } catch (err: any) {
      if (err?.status !== undefined) throw err;
      throw { status: 0, message: err?.message || `Failed to fetch ${url}`, url };
    }
  },

  /** GET — returns full paginated envelope `{ data: T[], meta }`. Pass `token` for SSR calls. */
  async list<T>(url: string, params?: Record<string, unknown>, token?: string): Promise<PaginatedResponse<T>> {
    let queryString = "";
    if (params) {
      const cleanParams: Record<string, string> = {};
      for (const [key, value] of Object.entries(params)) {
        if (value != null) cleanParams[key] = String(value);
      }
      queryString = "?" + new URLSearchParams(cleanParams).toString();
    }
    const response = await fetch(`${API_BASE_URL}${url}${queryString}`, {
      method: "GET",
      headers: await getHeaders(token),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw { status: response.status, message: err?.message ?? `HTTP ${response.status}` };
    }
    return response.json() as Promise<PaginatedResponse<T>>;
  },

  /** POST — unwraps envelope `{ data: T }`. Pass `token` for SSR calls. */
  async post<T>(url: string, body?: unknown, token?: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "POST",
      headers: await getHeaders(token),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw { status: response.status, message: err?.message ?? `HTTP ${response.status}` };
    }
    const result = await response.json() as { data?: T };
    return (result.data ?? result) as T;
  },

  /** PUT — unwraps envelope `{ data: T }`. Pass `token` for SSR calls. */
  async put<T>(url: string, body?: unknown, token?: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "PUT",
      headers: await getHeaders(token),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw { status: response.status, message: err?.message ?? `HTTP ${response.status}` };
    }
    const result = await response.json() as { data?: T };
    return (result.data ?? result) as T;
  },

  /** PATCH — unwraps envelope `{ data: T }`. Pass `token` for SSR calls. */
  async patch<T>(url: string, body?: unknown, token?: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "PATCH",
      headers: await getHeaders(token),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw { status: response.status, message: err?.message ?? `HTTP ${response.status}` };
    }
    const result = await response.json() as { data?: T };
    return (result.data ?? result) as T;
  },

  /** DELETE — unwraps envelope `{ data: T }`. Pass `token` for SSR calls. */
  async delete<T>(url: string, token?: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "DELETE",
      headers: await getHeaders(token),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw { status: response.status, message: err?.message ?? `HTTP ${response.status}` };
    }
    const result = await response.json() as { data?: T };
    return (result.data ?? result) as T;
  },

  /**
   * Upload FormData (multipart) — does NOT set Content-Type so the browser
   * sets the correct multipart boundary automatically.
   * Pass `token` for SSR calls.
   */
  async upload<T>(url: string, formData: FormData, method: "POST" | "PUT" | "PATCH" = "POST", token?: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method,
      headers: await getAuthHeader(token),
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw { status: response.status, message: err?.message ?? `HTTP ${response.status}` };
    }
    const result = await response.json() as { data?: T };
    return (result.data ?? result) as T;
  },
};

export default apiClient;
