"use client";

import { TransactionRow } from "./TransactionRow";
import type { TransactionListItem } from "../types/transaction";

interface TransactionsListProps {
  transactions: TransactionListItem[];
  selectedTransactionId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Scrollable list of transactions.
 *
 * Owns no state — selection is lifted into `TransactionsWorkspace` so the
 * details panel can render from the same source of truth.
 */
export function TransactionsList({
  transactions,
  selectedTransactionId,
  onSelect,
}: TransactionsListProps) {
  if (transactions.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul
      role="list"
      className="divide-y divide-zinc-100"
    >
      {transactions.map((transaction) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          selected={selectedTransactionId === transaction.id}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden
        >
          <path d="M3 7h18" />
          <path d="M3 12h18" />
          <path d="M3 17h12" />
        </svg>
      </div>
      <p className="text-sm font-medium text-zinc-900">No transactions yet</p>
      <p className="max-w-xs text-xs text-zinc-500">
        Transactions from your connected accounts will appear here.
      </p>
    </div>
  );
}
