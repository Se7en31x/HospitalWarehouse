"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getProfile, type UserProfile } from "@/services/profileService";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UserContextValue {
  profile: UserProfile | null;
  /** Formatted Thai name (or email / fallback string). */
  displayName: string;
  /** User's role name, e.g. "เจ้าหน้าที่คลัง". */
  roleName: string;
  /** True only while the initial fetch is in-flight (never true when SSR data is provided). */
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const UserContext = createContext<UserContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

interface UserProviderProps {
  children: ReactNode;
  /**
   * Profile data pre-fetched by the Server Component layout.
   * When provided, the client-side fetch is skipped entirely — no loading
   * state, no flicker, the name is visible on the very first paint.
   * When null/undefined the provider falls back to fetching on the client.
   */
  initialProfile?: UserProfile | null;
}

export function UserProvider({ children, initialProfile = null }: UserProviderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  // If we have SSR data, we're already done — skip the loading state.
  const [isLoading, setIsLoading] = useState<boolean>(initialProfile === null);

  useEffect(() => {
    // SSR pre-fetched the data — nothing to do on the client.
    if (initialProfile !== null) return;

    getProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setIsLoading(false));
  }, []); // intentionally empty — run once on mount

  const displayName = profile
    ? [profile.title?.short_name, profile.firstname_th, profile.lastname_th]
        .filter(Boolean)
        .join(" ") || profile.email || "ผู้ใช้งาน"
    : "ผู้ใช้งาน";

  const roleName = profile?.role?.name ?? "guest";

  return (
    <UserContext.Provider value={{ profile, displayName, roleName, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the shared user profile from the nearest <UserProvider>.
 * Throws in development if called outside a provider so the missing wrapper
 * is caught immediately during development.
 */
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
