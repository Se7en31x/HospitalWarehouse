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
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      initialProfile = await getProfile(session.access_token);
    }
  } catch {
    // Session unavailable or API error — client-side fetch is the fallback.
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
