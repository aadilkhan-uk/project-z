import { NextRequest, NextResponse } from "next/server";
import {
  getAccounts,
  getAccountTransactions,
  refreshAccessToken,
  type Transaction,
} from "@/lib/truelayer";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  let accessToken = request.cookies.get("tl_access_token")?.value;
  const refreshToken = request.cookies.get("tl_refresh_token")?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json(
      { error: "Not authenticated. Please connect your bank account." },
      { status: 401 }
    );
  }

  // Attempt a token refresh if the access token is missing (expired cookie)
  let newTokens: { access_token: string; refresh_token: string; expires_in: number } | null = null;

  if (!accessToken && refreshToken) {
    try {
      newTokens = await refreshAccessToken(refreshToken);
      accessToken = newTokens.access_token;
    } catch {
      return NextResponse.json(
        { error: "Session expired. Please reconnect your bank account." },
        { status: 401 }
      );
    }
  }

  try {
    // 1. Get all accounts
    const accounts = await getAccounts(accessToken!);

    // 2. Fetch transactions for all accounts in parallel
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        const txs = await getAccountTransactions(
          accessToken!,
          account.account_id,
          from,
          to
        );

        // Enrich each transaction with the account it belongs to
        return txs.map((tx): Transaction => ({
          ...tx,
          account_id: account.account_id,
          account_display_name: account.display_name,
        }));
      })
    );

    const transactions: Transaction[] = [];
    const errors: string[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        transactions.push(...result.value);
      } else {
        errors.push(result.reason?.message ?? "Unknown error");
      }
    }

    // Sort newest first
    transactions.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const response = NextResponse.json({
      transactions,
      count: transactions.length,
      accounts: accounts.length,
      ...(errors.length > 0 && { partial_errors: errors }),
    });

    // If we refreshed the token, set the new cookies on the response
    if (newTokens) {
      const accessExpiry = new Date(Date.now() + newTokens.expires_in * 1000);
      const refreshExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      response.cookies.set("tl_access_token", newTokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: accessExpiry,
        path: "/",
      });

      response.cookies.set("tl_refresh_token", newTokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: refreshExpiry,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Transactions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions. Please try again." },
      { status: 500 }
    );
  }
}
