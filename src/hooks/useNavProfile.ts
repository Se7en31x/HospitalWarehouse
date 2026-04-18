"use client";

import { useUser } from "@/context/UserContext";

/**
 * Lightweight hook used by WarehouseNavbar and RequestNavbar.
 *
 * Previously fetched the profile independently in each navbar.
 * Now reads from the shared UserContext so the profile is fetched
 * exactly once per layout — zero duplicate requests.
 */
export const useNavProfile = () => {
  const { profile, displayName, roleName, isLoading } = useUser();
  return { profile, displayName, roleName, isLoading };
};
