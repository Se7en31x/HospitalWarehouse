import { auth0 } from "@/lib/auth0";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // 1. ให้ Auth0 จัดการพวก /auth/login, /auth/callback ก่อน
  const authResponse = await auth0.middleware(request);

  // 2. ถ้า authResponse มีการจัดการไปแล้ว (เช่น กำลังเด้งไป Auth0) ให้ส่งกลับเลย
  if (authResponse.headers.has("x-middleware-next") === false) {
    return authResponse;
  }

  const session = await auth0.getSession(request);
  
  // ถ้าพยายามเข้าหน้าอื่น (ที่ไม่ใช่หน้าแรก) แล้วไม่มี Session ให้เตะไป Login
  const isHomePage = request.nextUrl.pathname === '/';
  if (!session && !isHomePage) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return authResponse;
}

export const config = {
  matcher: [
    // ดักจับทุกหน้า ยกเว้นพวกไฟล์ระบบ รูปภาพ
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};