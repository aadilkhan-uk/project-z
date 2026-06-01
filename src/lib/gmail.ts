import { NextResponse } from "next/server";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GmailTokenResult {
  accessToken: string;
  /**
   * If the access token was silently refreshed, call this on every NextResponse
   * you return so the new cookies are written to the browser.
   */
  applyRefreshedCookies: ((response: NextResponse) => void) | null;
}

/**
 * Returns the current Gmail access token, refreshing it transparently when it
 * has expired.  Returns null when neither an access token nor a usable refresh
 * token is present (i.e. the user needs to re-authorise).
 */
export async function getGmailAccessToken(
  cookieStore: ReadonlyRequestCookies
): Promise<GmailTokenResult | null> {
  const accessToken = cookieStore.get("gmail_access_token")?.value;

  if (accessToken) {
    return { accessToken, applyRefreshedCookies: null };
  }

  const refreshToken = cookieStore.get("gmail_refresh_token")?.value;
  if (!refreshToken) return null;

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    console.error("Gmail token refresh failed:", res.status, await res.text());
    return null;
  }

  const { access_token, expires_in } = await res.json();

  const isProduction = process.env.NODE_ENV === "production";

  // Google does not rotate the refresh token on each use, so we only need to
  // update the access token cookie.
  const applyRefreshedCookies = (response: NextResponse) => {
    response.cookies.set("gmail_access_token", access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      expires: new Date(Date.now() + expires_in * 1000),
      path: "/",
    });
  };

  return { accessToken: access_token, applyRefreshedCookies };
}
