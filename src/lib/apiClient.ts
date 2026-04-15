import { createClient } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const API_SECRET_KEY = process.env.NEXT_PUBLIC_API_SECRET_KEY || process.env.API_SECRET_KEY || "";

// src/lib/apiClient.ts
const getHeaders = async () => {
  // Server-side: use API secret key if available
  if (typeof window === "undefined") {
    if (API_SECRET_KEY) {
      return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_SECRET_KEY}`,
      };
    }
    // If no secret key, return just content type
    return {
      "Content-Type": "application/json",
    };
  }

  // Client-side: use Supabase session
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // DEBUG: ก๊อปปี้ค่าที่ขึ้นใน Console ไปเช็คใน jwt.io
    console.log("🔍 [Frontend] Sending Token:", token);

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  } catch (error) {
    // Fallback to no auth if auth fails
    return {
      "Content-Type": "application/json",
    };
  }
};
        
const getAuthHeader = async (): Promise<Record<string, string>> => {
  // Server-side: use API secret key if available
  if (typeof window === "undefined") {
    if (API_SECRET_KEY) {
      return { Authorization: `Bearer ${API_SECRET_KEY}` };
    }
    return {};
  }

  // Client-side: use Supabase session
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
  } catch (error) {
    return {};
  }
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
  /** GET — unwraps envelope `{ data: T }` */
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
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
        headers: await getHeaders(),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as Record<string, unknown>;
        const errorMessage = typeof err?.message === 'string' 
          ? err.message 
          : `HTTP ${response.status}`;
        throw { 
          status: response.status, 
          message: errorMessage,
          url: url
        };
      }
      const body = await response.json() as { data?: T };
      return (body.data ?? body) as T;
    } catch (err: any) {
      // Ensure error has proper structure
      if (err?.status !== undefined) {
        throw err;
      }
      throw {
        status: 0,
        message: err?.message || `Failed to fetch ${url}`,
        url: url
      };
    }
  },

  /** GET — returns full paginated envelope `{ data: T[], meta }` */
  async list<T>(url: string, params?: Record<string, unknown>): Promise<PaginatedResponse<T>> {
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
      headers: await getHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw { status: response.status, message: err?.message ?? `HTTP ${response.status}` };
    }
    return response.json() as Promise<PaginatedResponse<T>>;
  },

  /** POST — unwraps envelope `{ data: T }` */
  async post<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "POST",
      headers: await getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw { status: response.status, message: err?.message ?? `HTTP ${response.status}` };
    }
    const result = await response.json() as { data?: T };
    return (result.data ?? result) as T;
  },

  /** PUT — unwraps envelope `{ data: T }` */
  async put<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "PUT",
      headers: await getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw { status: response.status, message: err?.message ?? `HTTP ${response.status}` };
    }
    const result = await response.json() as { data?: T };
    return (result.data ?? result) as T;
  },

  /** PATCH — unwraps envelope `{ data: T }` */
  async patch<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "PATCH",
      headers: await getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw { status: response.status, message: err?.message ?? `HTTP ${response.status}` };
    }
    const result = await response.json() as { data?: T };
    return (result.data ?? result) as T;
  },

  /** DELETE — unwraps envelope `{ data: T }` */
  async delete<T>(url: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "DELETE",
      headers: await getHeaders(),
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
   */
  async upload<T>(url: string, formData: FormData, method: "POST" | "PUT" | "PATCH" = "POST"): Promise<T> {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method,
      headers: authHeader,
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
