import { NextResponse } from "next/server";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";

export interface XeroTokenResult {
  accessToken: string;
  /**
   * If the access token was silently refreshed, call this on every NextResponse
   * you return so the new cookies are written to the browser.
   */
  applyRefreshedCookies: ((response: NextResponse) => void) | null;
}

/**
 * Returns the current Xero access token, refreshing it transparently when it
 * has expired.  Returns null when neither an access token nor a usable refresh
 * token is present (i.e. the user needs to re-authorise).
 */
export async function getXeroAccessToken(
  cookieStore: ReadonlyRequestCookies
): Promise<XeroTokenResult | null> {
  const accessToken = cookieStore.get("xero_access_token")?.value;

  if (accessToken) {
    return { accessToken, applyRefreshedCookies: null };
  }

  const refreshToken = cookieStore.get("xero_refresh_token")?.value;
  if (!refreshToken) return null;

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    console.error("Xero token refresh failed:", res.status, await res.text());
    return null;
  }

  const {
    access_token,
    refresh_token: newRefreshToken,
    expires_in,
  } = await res.json();

  const isProduction = process.env.NODE_ENV === "production";

  const applyRefreshedCookies = (response: NextResponse) => {
    response.cookies.set("xero_access_token", access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      expires: new Date(Date.now() + expires_in * 1000),
      path: "/",
    });

    // Xero rotates the refresh token on each use — persist the new one.
    if (newRefreshToken) {
      response.cookies.set("xero_refresh_token", newRefreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        expires: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        path: "/",
      });
    }
  };

  return { accessToken: access_token, applyRefreshedCookies };
}
