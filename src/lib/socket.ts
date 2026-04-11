import { io } from "socket.io-client";
import { createClient } from "@/lib/supabase/client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
console.log("🔌 Socket initializing connection to:", SOCKET_URL);

/**
 * ดึงข้อมูล Identity จาก Supabase Session
 */
const getSocketIdentity = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) return null;

    return {
        userId: session.user.id,
        // ดึง role จาก user_metadata หรือ app_metadata ตามที่คุณตั้งค่าไว้ใน Supabase
        roles: session.user.app_metadata?.role ? [session.user.app_metadata.role] : ["user"],
    };
};

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ["websocket"],
});

// เปลี่ยน connect handler ให้เป็น async เพื่อรอข้อมูลจาก Supabase
socket.on("connect", async () => {
    const identity = await getSocketIdentity();
    if (identity?.userId) {
        console.log("📡 Registering notification channel for:", identity.userId);
        socket.emit("REGISTER_NOTIFICATION_CHANNEL", identity);
    }
});