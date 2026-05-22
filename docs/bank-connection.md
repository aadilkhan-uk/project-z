# Bank Connection

Project Z uses [TrueLayer](https://truelayer.com) to connect to a user's bank account. TrueLayer is a regulated open banking provider that handles all communication with UK banks — the app never sees the user's banking credentials.

---

## How it works

The connection follows the standard OAuth 2.0 authorisation code flow, split across three steps.

### 1. Initiating the connection

**Route:** `GET /api/auth/truelayer`

When the user clicks **Connect bank account**, they are redirected to TrueLayer's hosted auth dialog. The app builds a URL with the following parameters and redirects the user there:

| Parameter       | Value                                      |
|-----------------|--------------------------------------------|
| `response_type` | `code`                                     |
| `client_id`     | Your TrueLayer app ID                      |
| `scope`         | `accounts transactions offline_access`     |
| `redirect_uri`  | `http://localhost:3000/api/auth/callback`  |
| `providers`     | `uk-ob-all uk-oauth-all uk-cs-mock`        |

**Scopes explained:**
- `accounts` — permission to list the user's bank accounts
- `transactions` — permission to read transaction history
- `offline_access` — issues a refresh token so the connection lasts 90 days instead of just 1 hour

**Providers:**
- `uk-ob-all` / `uk-oauth-all` — all supported UK banks
- `uk-cs-mock` — TrueLayer's Mock Bank (sandbox only, remove for production)

The user logs in to their bank entirely within TrueLayer's UI. The app is never involved in that step.

---

### 2. User authorises with their bank

TrueLayer shows the user a consent screen listing exactly what data will be shared. The user selects their bank, authenticates, and grants consent.

Once complete, TrueLayer redirects the user back to the app's `redirect_uri` with a short-lived `code` in the URL:

```
http://localhost:3000/api/auth/callback?code=<one-time-code>
```

This code is valid for **5 minutes** and can only be used once.

---

### 3. Exchanging the code for tokens

**Route:** `GET /api/auth/callback`

The callback route receives the `code` and immediately exchanges it for tokens by making a server-side POST to TrueLayer:

```
POST https://auth.truelayer-sandbox.com/connect/token

grant_type=authorization_code
client_id=...
client_secret=...
redirect_uri=...
code=...
```

TrueLayer responds with:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600
}
```

Both tokens are stored in **secure HTTP-only cookies** (`tl_access_token`, `tl_refresh_token`). These cookies are never accessible to JavaScript, which protects them from XSS attacks. The user is then redirected to `/dashboard`.

---

## Token lifecycle

| Token           | Lifetime                       | Stored in             |
|-----------------|--------------------------------|-----------------------|
| `access_token`  | 1 hour                         | `tl_access_token` cookie |
| `refresh_token` | 90 days (UK open banking limit) | `tl_refresh_token` cookie |

After 1 hour the `access_token` expires. The `refresh_token` can be used to silently issue a new one without the user having to re-authenticate. After 90 days the entire connection expires (this is a UK regulatory requirement under PSD2) and the user must reconnect.

---

## Environment variables

| Variable            | Description                              |
|---------------------|------------------------------------------|
| `TL_CLIENT_ID`      | TrueLayer application client ID         |
| `TL_CLIENT_SECRET`  | TrueLayer application client secret     |
| `TL_REDIRECT_URI`   | OAuth callback URL registered in TrueLayer Console |

These are stored in `.env.local` and never committed to version control.

---

## Sandbox vs production

The current implementation uses TrueLayer's **sandbox** environment (`auth.truelayer-sandbox.com`). No real bank data is accessed.

To switch to production:
1. Change `auth.truelayer-sandbox.com` → `auth.truelayer.com` in both route files
2. Remove `uk-cs-mock` from the `providers` parameter in `/api/auth/truelayer/route.ts`
3. Update the TrueLayer Console app to production mode and replace the credentials in `.env.local`
