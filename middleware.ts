import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/_next", "/favicon.ico", "/branding", "/api/auth/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── DEV MODE: skip ALL auth, and bounce /login straight to /today ──
  if (process.env.NODE_ENV !== "production") {
    // If user lands on /login in dev, immediately redirect server-side to /today.
    if (pathname === "/login" || pathname === "/login/") {
      return NextResponse.redirect(new URL("/today", request.url));
    }
    // Everything else: just let it through, no auth check.
    return NextResponse.next();
  }

  // ── PRODUCTION: full auth gating ──
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow login page itself in production
  if (pathname === "/login" || pathname === "/login/") {
    return NextResponse.next();
  }

  // Check session cookie
  const token = request.cookies.get("mab_session")?.value;
  if (token) {
    // Basic structural check — full HMAC verify happens in auth.ts
    // Middleware Edge Runtime can't use Node crypto, so we just check structure
    const parts = token.split(".");
    if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) {
      return NextResponse.next();
    }
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
