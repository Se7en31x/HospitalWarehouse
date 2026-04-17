import { api } from '@/lib/apiClient';

export interface ProfileDepartment {
  id: number;
  name: string;
  code: string;
}

export interface ProfileRole {
  id: number | null;
  name: string;
  name_en?: string;
}

export interface ProfileAddress {
  detail:      string | null;
  subdistrict: string | null;
  district:    string | null;
  province:    string | null;
  zip_code:    number | null;
}

export interface UserProfile {
  id:           string | null;
  email:        string | null;
  firstname_th: string | null;
  lastname_th:  string | null;
  firstname_en: string | null;
  lastname_en:  string | null;
  title:        { code: string; short_name: string | null; name: string } | null;
  sex:          { code: string; name: string } | null;
  birth_date:   string | null;
  age:          number | null;
  nationality:  string | null;
  race:         string | null;
  phone:        string | null;
  cid:          string | null;
  profession_id: string | null;
  address:      ProfileAddress;
  departments:  ProfileDepartment[];
  role:         ProfileRole;
  created_at:   string | null;
}

/**
 * Fetch the current user's profile directly from the backend API.
 * Pass `token` from a Server Component to authenticate the SSR request.
 * Omit it for client-side calls — the browser session is used automatically.
 * NOTE: client-side callers should prefer `getMyProfile()` below, which routes
 * the request through the Next.js server so auth is always reliable.
 */
export const getProfile = async (token?: string): Promise<UserProfile> =>
  api.get<UserProfile>('/v1/user/profile', undefined, token);

export interface UpdateProfilePayload {
  firstname_th?: string;
  lastname_th?: string;
  firstname_en?: string;
  lastname_en?: string;
  title_code?: string;
  phone?: string;
}

export const updateProfile = async (payload: UpdateProfilePayload): Promise<UserProfile> =>
  api.patch<UserProfile>('/v1/user/profile', payload);

export const getMyProfile = async (): Promise<UserProfile> => {
  const res = await fetch('/api/me', { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw { status: res.status, message: body.error ?? `HTTP ${res.status}` };
  }
  return res.json() as Promise<UserProfile>;
};
