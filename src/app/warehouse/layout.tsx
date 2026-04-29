import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, type UserProfile } from "@/services/profileService";
import { UserProvider } from "@/context/UserContext";
import WarehouseNavbar from "@/components/layouts/WarehouseNavbar";
import WarehouseSidebar from "@/components/layouts/WarehouseSidebar";
import MainContentWrapper from "@/components/layouts/MainContentWrapper";

/**
 * Warehouse layout — async Server Component.
 *
 * Pre-fetches the user profile server-side so the navbar renders the user's
 * name on the very first paint (no skeleton flash).  The profile is stored
 * in UserProvider and shared by every navbar/component in this subtree —
 * zero duplicate API calls.
 *
 * If the SSR fetch fails (e.g. expired session), UserProvider automatically
 * falls back to a client-side fetch on mount.
 */
export default async function WarehouseLayout({ children }: { children: ReactNode }) {
  let initialProfile: UserProfile | null = null;

  try {
    const supabase = await createClient();
    // getUser() validates with Supabase servers and refreshes an expired token;
    // getSession() alone reads the cookie without revalidating.
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("[WarehouseLayout] getUser() error:", userError.message);
    } else if (user) {
      console.log("[WarehouseLayout] SSR user id:", user.id, "| email:", user.email);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        initialProfile = await getProfile(session.access_token);
        console.log("[WarehouseLayout] SSR profile loaded:", initialProfile?.firstname_th, initialProfile?.lastname_th);
      } else {
        console.warn("[WarehouseLayout] No access_token in session after getUser()");
      }
    }
  } catch (e) {
    console.error("[WarehouseLayout] SSR profile fetch failed:", e);
  }

  return (
    <UserProvider initialProfile={initialProfile}>
      <div className="flex flex-col h-screen w-full overflow-hidden bg-[#f5f5f5] text-slate-900">

        <WarehouseNavbar />

        <div className="flex flex-1 overflow-hidden w-full">
          <WarehouseSidebar />
          <MainContentWrapper>{children}</MainContentWrapper>
        </div>

      </div>
    </UserProvider>
  );
}
