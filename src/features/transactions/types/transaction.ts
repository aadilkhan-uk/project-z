/**
 * Domain types used by the transactions feature.
 *
 * The `TransactionListItem` is the only shape components should depend on;
 * raw API responses are normalised via `mapTransaction` before reaching the UI.
 */

export type TransactionDirection = "in" | "out";

export interface TransactionListItem {
  id: string;
  merchant: string;
  description: string;
  amount: number;
  signedAmount: number;
  currency: string;
  timestamp: Date;
  direction: TransactionDirection;
  category: string;
  classification: string[];
  accountDisplayName: string;
  runningBalance?: {
    amount: number;
    currency: string;
  };
}
