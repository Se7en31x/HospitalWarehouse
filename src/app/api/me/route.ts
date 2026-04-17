import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profileService";

/**
 * GET /api/me
 *
 * Server-side proxy that fetches the DB profile for the currently logged-in user.
 * Running this as a Route Handler means we read the Supabase session from HTTP
 * cookies (always available server-side after middleware refresh) instead of
 * trying to read an HttpOnly cookie from browser JavaScript, which always fails.
 *
 * UserContext calls this endpoint instead of the backend API directly so that
 * client components never have to manage the auth token themselves.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // getUser() validates with Supabase servers and refreshes the token if
    // needed — more reliable than getSession() which only reads the local cookie.
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("[/api/me] No authenticated user:", userError?.message);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the fresh access_token to call the backend API on behalf of the user.
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      console.error("[/api/me] No access_token in session for user:", user.id);
      return NextResponse.json({ error: "No session token" }, { status: 401 });
    }

    console.log("[/api/me] Fetching DB profile for user:", user.id, "|", user.email);

    const profile = await getProfile(session.access_token);

    // Log whether a real profile row was found (helps diagnose missing rows)
    if (!profile.firstname_th && !profile.lastname_th) {
      console.warn(
        "[/api/me] Profile row found but name fields are empty for user:",
        user.id,
        "— Check that a row exists in public.profiles with id =", user.id
      );
    }

    return NextResponse.json(profile);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/me] Profile fetch failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
