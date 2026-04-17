import { io, type Socket } from "socket.io-client";
import { createClient } from "@/lib/supabase/client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

// ── SSR stub ──────────────────────────────────────────────────────────────────
// socket.io-client must ONLY run in the browser. During Next.js SSR the module
// is evaluated on the server (for pre-rendering), so we return a no-op stub.
// useEffect — where every component actually calls socket.on / socket.connect —
// never runs on the server, so the stub is never actually invoked.
function createNoopSocket(): Socket {
  const noop = () => noopSocket;
  const noopSocket = {
    connected: false,
    connect: noop, disconnect: noop,
    on: noop, off: noop, once: noop, emit: noop,
    id: "",
  } as unknown as Socket;
  return noopSocket;
}

// ── Register the user's socket room ──────────────────────────────────────────
// Uses getUser() (server-validated, cookie-independent) instead of getSession()
// which returns null when the session is stored in an HttpOnly SSR cookie.
async function registerNotificationChannel(s: Socket) {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.warn("[Socket] getUser() returned no user — notification channel NOT registered:", error?.message);
      return;
    }
    const identity = {
      userId: user.id,
      roles: user.app_metadata?.role ? [user.app_metadata.role] : ["user"],
    };
    console.log("[Socket] Registering notification channel for user:", user.id);
    s.emit("REGISTER_NOTIFICATION_CHANNEL", identity);
  } catch (err) {
    console.error("[Socket] Failed to register notification channel:", err);
  }
}

// ── Real browser socket ───────────────────────────────────────────────────────
function createBrowserSocket(): Socket {
  console.log("[Socket] Initializing client → ", SOCKET_URL);

  const s = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ["websocket"],
  });

  s.on("connect", async () => {
    console.log("[Socket] Connected ✅  id:", s.id);
    await registerNotificationChannel(s);
  });

  s.on("reconnect", (attempt: number) => {
    console.log("[Socket] Reconnected after attempt", attempt, "| id:", s.id);
    registerNotificationChannel(s);
  });

  s.on("disconnect", (reason: string) => {
    console.warn("[Socket] Disconnected:", reason);
  });

  s.on("connect_error", (err: Error) => {
    console.error("[Socket] Connection error:", err.message, "| URL:", SOCKET_URL);
  });

  return s;
}

// ── Singleton export ──────────────────────────────────────────────────────────
export const socket: Socket =
  typeof window === "undefined" ? createNoopSocket() : createBrowserSocket();
