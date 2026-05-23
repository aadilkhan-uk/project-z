import type { Transaction } from "@/lib/truelayer";
import type {
  TransactionDirection,
  TransactionListItem,
} from "../types/transaction";

/**
 * Normalises a raw TrueLayer transaction into the view-model used by the UI.
 *
 * Components should never read TrueLayer fields directly — they consume the
 * `TransactionListItem` produced by this mapper. Keeping the transformation in
 * one place isolates the UI from changes to the upstream provider's schema.
 */
export function mapTransaction(tx: Transaction): TransactionListItem {
  const direction: TransactionDirection =
    tx.transaction_type === "CREDIT" ? "in" : "out";

  // TrueLayer reports `amount` as a positive number with the direction encoded
  // in `transaction_type`. We compute a signed value for display and keep the
  // absolute amount available too.
  const absoluteAmount = Math.abs(tx.amount);
  const signedAmount = direction === "in" ? absoluteAmount : -absoluteAmount;

  return {
    id: tx.transaction_id,
    merchant: tx.merchant_name?.trim() || tx.description,
    description: tx.description,
    amount: absoluteAmount,
    signedAmount,
    currency: tx.currency,
    timestamp: new Date(tx.timestamp),
    direction,
    category: tx.transaction_category,
    classification: tx.transaction_classification ?? [],
    accountDisplayName: tx.account_display_name,
    runningBalance: tx.running_balance,
  };
}
