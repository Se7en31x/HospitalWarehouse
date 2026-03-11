const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export const apiClient = {
  async get(url: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null;
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
    }

    return {
      data: await response.json(),
      status: response.status,
    };
  },

  async post(url: string, data: any) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null;
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
    }

    return {
      data: await response.json(),
      status: response.status,
    };
  },

  async put(url: string, data: any) {
    const token = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null;
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
    }

    return {
      data: await response.json(),
      status: response.status,
    };
  },
};

export default apiClient;
