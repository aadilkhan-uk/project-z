const TRUELAYER_API_URL = "https://api.truelayer-sandbox.com/data/v1";
const TRUELAYER_AUTH_URL = "https://auth.truelayer-sandbox.com";

export interface Account {
  account_id: string;
  account_type: "TRANSACTION" | "SAVINGS" | "BUSINESS_TRANSACTION" | "BUSINESS_SAVINGS";
  display_name: string;
  currency: string;
  account_number: {
    iban?: string;
    number?: string;
    sort_code?: string;
    swift_bic?: string;
  };
  provider: {
    provider_id: string;
  };
  update_timestamp: string;
}

export interface Transaction {
  transaction_id: string;
  normalised_provider_transaction_id?: string;
  timestamp: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: "CREDIT" | "DEBIT";
  transaction_category: string;
  transaction_classification: string[];
  merchant_name?: string;
  running_balance?: {
    amount: number;
    currency: string;
  };
  meta?: Record<string, string>;
  // Enriched with account info after fetching
  account_id: string;
  account_display_name: string;
}

export interface TokenRefreshResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Refreshes an expired access token using the refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenRefreshResult> {
  const response = await fetch(`${TRUELAYER_AUTH_URL}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.TL_CLIENT_ID!,
      client_secret: process.env.TL_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${await response.text()}`);
  }

  return response.json();
}

/**
 * Fetches all accounts for the authenticated user.
 */
export async function getAccounts(accessToken: string): Promise<Account[]> {
  const response = await fetch(`${TRUELAYER_API_URL}/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts: ${response.status}`);
  }

  const data = await response.json();
  return data.results;
}

/**
 * Fetches transactions for a specific account within an optional date range.
 */
export async function getAccountTransactions(
  accessToken: string,
  accountId: string,
  from?: string,
  to?: string
): Promise<Omit<Transaction, "account_id" | "account_display_name">[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const url = `${TRUELAYER_API_URL}/accounts/${accountId}/transactions${
    params.size > 0 ? `?${params.toString()}` : ""
  }`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch transactions for account ${accountId}: ${response.status}`
    );
  }

  const data = await response.json();
  return data.results;
}
