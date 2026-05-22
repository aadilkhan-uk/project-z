import { NextRequest, NextResponse } from "next/server";

const TRUELAYER_AUTH_URL = "https://auth.truelayer-sandbox.com";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?error=missing_code", request.url)
    );
  }

  const clientId = process.env.TL_CLIENT_ID!;
  const clientSecret = process.env.TL_CLIENT_SECRET!;
  const redirectUri = process.env.TL_REDIRECT_URI!;

  // Exchange the code for tokens
  const tokenResponse = await fetch(`${TRUELAYER_AUTH_URL}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    console.error("TrueLayer token exchange failed:", body);
    return NextResponse.redirect(
      new URL("/?error=token_exchange_failed", request.url)
    );
  }

  const { access_token, refresh_token, expires_in } =
    await tokenResponse.json();

  // Store tokens in secure HTTP-only cookies
  const next = searchParams.get("next") ?? "/dashboard";
  const response = NextResponse.redirect(new URL(next, request.url));

  const accessTokenExpiry = new Date(Date.now() + expires_in * 1000);
  // Refresh token is valid for 90 days
  const refreshTokenExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  response.cookies.set("tl_access_token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: accessTokenExpiry,
    path: "/",
  });

  response.cookies.set("tl_refresh_token", refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: refreshTokenExpiry,
    path: "/",
  });

  return response;
}
