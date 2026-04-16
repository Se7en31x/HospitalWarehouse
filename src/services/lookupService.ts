import { api } from "@/lib/apiClient";

export interface ProvinceOption {
  id: string;       // 2-char province code, e.g. "10"
  name: string;
}

export interface DistrictOption {
  id: string;       // 4-char district code, e.g. "1001"
  name: string;
  // zip_code lives on the subdistrict row, not here
}

export interface SubdistrictOption {
  id: string;       // 6-char subdistrict code, e.g. "100101"
  name: string;
  zip_code: string | null;
}

export const getProvinces = (): Promise<ProvinceOption[]> =>
  api.get<ProvinceOption[]>("/v1/lookup/provinces");

export const getDistricts = (provinceId: string): Promise<DistrictOption[]> =>
  api.get<DistrictOption[]>(`/v1/lookup/districts/${provinceId}`);

export const getSubdistricts = (districtId: string): Promise<SubdistrictOption[]> =>
  api.get<SubdistrictOption[]>(`/v1/lookup/subdistricts/${districtId}`);
