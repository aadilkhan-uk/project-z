import { NextRequest, NextResponse } from "next/server";

const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/xero?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/xero?error=missing_code", request.url)
    );
  }

  const clientId = process.env.XERO_CLIENT_ID!;
  const clientSecret = process.env.XERO_CLIENT_SECRET!;
  const redirectUri = process.env.XERO_REDIRECT_URI!;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL("/xero?error=missing_env", request.url)
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenResponse = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    console.error("Xero token exchange failed:", body);
    return NextResponse.redirect(
      new URL("/xero?error=token_exchange_failed", request.url)
    );
  }

  const { access_token, refresh_token, expires_in } =
    await tokenResponse.json();

  const response = NextResponse.redirect(new URL("/xero", request.url));

  const accessTokenExpiry = new Date(Date.now() + expires_in * 1000);
  const refreshTokenExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  response.cookies.set("xero_access_token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: accessTokenExpiry,
    path: "/",
  });

  if (refresh_token) {
    response.cookies.set("xero_refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: refreshTokenExpiry,
      path: "/",
    });
  }

  return response;
}
