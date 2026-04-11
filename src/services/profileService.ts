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

export const getProfile = async (): Promise<UserProfile> =>
  api.get<UserProfile>('/v1/user/profile');
