import {redirect} from "next/navigation";

const TRUELAYER_AUTH_URL = "https://auth.truelayer-sandbox.com";

export async function GET() {
  const clientId = process.env.TL_CLIENT_ID;
  const redirectUri = process.env.TL_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response(
      JSON.stringify({error: "Missing TrueLayer environment variables"}),
      {status: 500, headers: {"Content-Type": "application/json"}},
    );
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "accounts transactions offline_access",
    redirect_uri: redirectUri,
    // uk-cs-mock enables TrueLayer's Mock Bank in the sandbox environment.
    // For production, remove uk-cs-mock and keep uk-ob-all uk-oauth-all.
    providers: "uk-ob-all uk-oauth-all uk-cs-mock",
  });

  redirect(`${TRUELAYER_AUTH_URL}/?${params.toString()}`);
}
