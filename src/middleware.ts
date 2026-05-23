import { NextRequest, NextResponse } from "next/server";

// Routes that require a connected bank account
const PROTECTED_ROUTES = ["/dashboard", "/transactions"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("tl_access_token");

  if (!accessToken) {
    const connectUrl = new URL("/connect", request.url);
    connectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(connectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/transactions/:path*"],
};
