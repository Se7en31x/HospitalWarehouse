const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ✅ 1. ปรับเหลือแค่ Content-Type อย่างเดียว
const getHeaders = (): Record<string, string> => {
  return {
    "Content-Type": "application/json",
  };
};

// Helper 2: จัดการ Response กลาง
const handleResponse = async <T>(response: Response): Promise<{ data: T; status: number }> => {
  // แจ้งเตือน 401 ไว้ใน Console เผื่อ Backend ยังเปิด Middleware ทิ้งไว้
  if (response.status === 401) {
    console.warn("⚠️ Backend ต้องการ Token (Unauthorized) แต่ตอนนี้เรายังไม่ได้ส่งไป");
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const errorData = data as Record<string, unknown> | null;
    throw {
      response: { data, status: response.status },
      message: typeof errorData?.message === 'string' ? errorData.message : `HTTP Error ${response.status}`,
    };
  }

  return { data: data as T, status: response.status };
};

export const apiClient = {
  async get<T>(url: string, config?: { params?: Record<string, unknown> }): Promise<{ data: T; status: number }> {
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
      headers: getHeaders(),
    });

    return await handleResponse<T>(response);
  },

  async post<T>(url: string, body?: unknown): Promise<{ data: T; status: number }> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "POST",
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return await handleResponse<T>(response);
  },

  async put<T>(url: string, body?: unknown): Promise<{ data: T; status: number }> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "PUT",
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return await handleResponse<T>(response);
  },

  async delete<T>(url: string): Promise<{ data: T; status: number }> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    return await handleResponse<T>(response);
  }
};

export default apiClient;