import "server-only";

import { cookies, headers } from "next/headers";

import type { Transaction } from "@/lib/truelayer";
import { mapTransaction } from "../lib/mapTransaction";
import type { TransactionListItem } from "../types/transaction";

interface TransactionsApiResponse {
  transactions: Transaction[];
  count: number;
  accounts: number;
  partial_errors?: string[];
  error?: string;
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("UNAUTHENTICATED");
    this.name = "UnauthenticatedError";
  }
}

/**
 * Fetches transactions from the in-app `/api/transactions` route handler and
 * maps them into the view-model used by the UI.
 *
 * Cookies are forwarded explicitly so the route handler can authenticate
 * the request — server-side fetch does not propagate them by default.
 */
export async function getTransactions(): Promise<TransactionListItem[]> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);

  const host = headerList.get("host");
  if (!host) {
    throw new Error("Missing host header — cannot resolve API base URL.");
  }

  const protocol =
    headerList.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");

  const response = await fetch(`${protocol}://${host}/api/transactions`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new UnauthenticatedError();
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch transactions (${response.status} ${response.statusText})`
    );
  }

  const data = (await response.json()) as TransactionsApiResponse;
  return data.transactions.map(mapTransaction);
}
