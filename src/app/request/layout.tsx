import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, type UserProfile } from "@/services/profileService";
import { UserProvider } from "@/context/UserContext";
import RequestNavbar from "@/components/layouts/RequestNavbar";
import RequestSidebar from "@/components/layouts/RequestSidebar";
import MainContentWrapper from "@/components/layouts/MainContentWrapper";

/**
 * Request layout — async Server Component.
 *
 * Same pattern as warehouse/layout.tsx: pre-fetches the user profile on the
 * server and passes it to UserProvider so RequestNavbar displays the user's
 * name immediately without a loading skeleton.
 */
export default async function RequestLayout({ children }: { children: ReactNode }) {
  let initialProfile: UserProfile | null = null;

  try {
    const supabase = await createClient();
    // getUser() validates with Supabase servers and refreshes an expired token;
    // getSession() alone reads the cookie without revalidating.
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("[RequestLayout] getUser() error:", userError.message);
    } else if (user) {
      console.log("[RequestLayout] SSR user id:", user.id, "| email:", user.email);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        initialProfile = await getProfile(session.access_token);
        console.log("[RequestLayout] SSR profile loaded:", initialProfile?.firstname_th, initialProfile?.lastname_th);
      } else {
        console.warn("[RequestLayout] No access_token in session after getUser()");
      }
    }
  } catch (e) {
    console.error("[RequestLayout] SSR profile fetch failed:", e);
  }

  return (
    <UserProvider initialProfile={initialProfile}>
      <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 text-slate-900">

        <RequestNavbar />

        <div className="flex flex-1 overflow-hidden w-full">
          <RequestSidebar />
          <MainContentWrapper>{children}</MainContentWrapper>
        </div>

      </div>
    </UserProvider>
  );
}
