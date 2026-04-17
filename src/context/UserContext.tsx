"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getProfile, getMyProfile, type UserProfile } from "@/services/profileService";

interface UserContextValue {
  profile: UserProfile | null;
  displayName: string;
  roleName: string;
  isLoading: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

interface UserProviderProps {
  children: ReactNode;
  initialProfile?: UserProfile | null;
}

export function UserProvider({ children, initialProfile = null }: UserProviderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState<boolean>(initialProfile === null);

  useEffect(() => {
    // SSR already fetched the profile in the layout and passed it as initialProfile.
    // Skip the client-side fetch entirely in that case.
    if (initialProfile !== null) return;

    const fetchProfile = async () => {
      // ── Attempt 1: /api/me (server-side proxy) ───────────────────────────────
      // This route handler reads the Supabase session from HTTP cookies on the
      // server, where it is ALWAYS available — even if the browser can't read
      // the HttpOnly SSR session cookie via document.cookie / getSession().
      try {
        const data = await getMyProfile();
        console.log("[UserContext] Profile loaded via /api/me:", data?.firstname_th, data?.lastname_th, "| email:", data?.email);
        setProfile(data);
        return;
      } catch (err1: unknown) {
        console.warn("[UserContext] /api/me failed, trying direct API with explicit token:", err1);
      }

      // ── Attempt 2: direct backend call with an explicit Supabase token ────────
      // getUser() makes a live round-trip to Supabase so it both validates the
      // session AND triggers a token refresh — more reliable than getSession().
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error("[UserContext] Supabase getUser() failed:", userError?.message, "| user:", user?.id);
          setProfile(null);
          return;
        }

        console.log("[UserContext] Supabase auth user:", user.id, "|", user.email);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          console.error("[UserContext] getUser() succeeded but getSession() has no access_token for:", user.id);
          setProfile(null);
          return;
        }

        const data = await getProfile(session.access_token);
        console.log("[UserContext] Profile loaded via direct API (retry):", data?.firstname_th, data?.lastname_th);
        setProfile(data);
      } catch (err2: unknown) {
        console.error(
          "[UserContext] All profile fetch attempts failed.\n" +
          "  → Check server console for [/api/me] logs to see the exact error.\n" +
          "  → Verify a row exists in public.profiles with id matching the Auth user UUID.",
          err2
        );
        setProfile(null);
      }
    };

    fetchProfile().finally(() => setIsLoading(false));
  }, []);

  // Build display name: Thai full name → English full name → email → fallback
  const displayName = profile
    ? [profile.title?.short_name, profile.firstname_th, profile.lastname_th]
        .filter(Boolean).join(" ")
      || [profile.firstname_en, profile.lastname_en].filter(Boolean).join(" ")
      || profile.email
      || "ผู้ใช้งาน"
    : "ผู้ใช้งาน";

  const roleName = profile?.role?.name ?? "guest";

  return (
    <UserContext.Provider value={{ profile, displayName, roleName, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error(
      "useUser() must be called inside <UserProvider>. " +
        "Wrap the route layout with <UserProvider> to fix this."
    );
  }
  return ctx;
}
