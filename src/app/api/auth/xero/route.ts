import { NextResponse } from "next/server";
import crypto from "crypto";

const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";

export async function GET() {
  const clientId = process.env.XERO_CLIENT_ID;
  const redirectUri = process.env.XERO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response(
      JSON.stringify({ error: "Missing Xero environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email accounting.invoices accounting.contacts offline_access",
    state,
  });

  return NextResponse.redirect(`${XERO_AUTH_URL}?${params.toString()}`);
}
