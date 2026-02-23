// ============================================================
// Middleware — Route Protection (Edge Runtime compatible)
// Uses cookie check — actual session validation in API routes
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check for auth session cookie (NextAuth v5 uses various cookie names)
    const hasSession =
        request.cookies.has("authjs.session-token") ||
        request.cookies.has("__Secure-authjs.session-token") ||
        request.cookies.has("next-auth.session-token") ||
        request.cookies.has("__Secure-next-auth.session-token");

    // Redirect to login if not authenticated and accessing protected routes
    if (pathname.startsWith("/dashboard") && !hasSession) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Redirect authenticated users away from auth pages
    if ((pathname === "/login" || pathname === "/signup") && hasSession) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/login", "/signup"],
};
