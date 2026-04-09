import { io } from "socket.io-client";
import Cookies from "js-cookie";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL
console.log("🔌 Socket initializing connection to:", SOCKET_URL);

const parseJwtPayload = (token: string) => {
    try {
        const base64 = token.split(".")[1];
        if (!base64) return null;
        const payload = JSON.parse(atob(base64));
        return payload;
    } catch {
        return null;
    }
};

const resolveSocketIdentity = () => {
    const token = Cookies.get("user_token") || "";
    const payload = token ? parseJwtPayload(token) : null;

    const userId =
        payload?.user_id ||
        payload?.id ||
        payload?.sub ||
        "";

    const role = payload?.role ? String(payload.role) : "";

    return {
        userId: userId ? String(userId) : "",
        roles: role ? [role] : [],
    };
};

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay:1000,

    transports: ["websocket"],
});

socket.on("connect", () => {
    const identity = resolveSocketIdentity();
    if (identity.userId) {
        socket.emit("REGISTER_NOTIFICATION_CHANNEL", identity);
    }
});
