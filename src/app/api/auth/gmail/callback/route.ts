import { NextRequest, NextResponse } from "next/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/invoices?gmail_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/invoices?gmail_error=missing_code", request.url)
    );
  }

  const clientId = process.env.GMAIL_CLIENT_ID!;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET!;
  const redirectUri = process.env.GMAIL_REDIRECT_URI!;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL("/invoices?gmail_error=missing_env", request.url)
    );
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    console.error("Gmail token exchange failed:", body);
    return NextResponse.redirect(
      new URL("/invoices?gmail_error=token_exchange_failed", request.url)
    );
  }

  const { access_token, refresh_token, expires_in } =
    await tokenResponse.json();

  const response = NextResponse.redirect(new URL("/invoices", request.url));

  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set("gmail_access_token", access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    expires: new Date(Date.now() + expires_in * 1000),
    path: "/",
  });

  // Google only issues a refresh token on the first consent — persist it
  // indefinitely so silent refresh works across access token expiry.
  if (refresh_token) {
    response.cookies.set("gmail_refresh_token", refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      path: "/",
    });
  }

  return response;
}
