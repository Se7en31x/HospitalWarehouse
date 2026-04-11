"use client";

import { useEffect, useState } from "react";
import { getProfile, type UserProfile } from "@/services/profileService";

interface NavProfile {
  displayName: string;
  roleName:    string;
  isLoading:   boolean;
}

/**
 * Lightweight hook used by both navbars.
 * Fetches only what is needed for the avatar area: display name + role.
 */
export const useNavProfile = (): NavProfile => {
  const [profile,   setProfile]   = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setIsLoading(false));
  }, []);

  const displayName = profile
    ? [profile.title?.short_name, profile.firstname_th, profile.lastname_th]
        .filter(Boolean)
        .join(" ") || profile.email || "ผู้ใช้งาน"
    : "ผู้ใช้งาน";

  const roleName = profile?.role?.name || "guest";

  return { displayName, roleName, isLoading };
};
