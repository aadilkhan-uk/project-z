"use client";

import { useMemo, useState } from "react";

import { TransactionDetailsPanel } from "./TransactionDetailsPanel";
import { TransactionsList } from "./TransactionsList";
import type { TransactionListItem } from "../types/transaction";

interface TransactionsWorkspaceProps {
  transactions: TransactionListItem[];
}

/**
 * Client boundary for the transactions explorer.
 *
 * Owns the single piece of UI state needed today — the currently selected
 * transaction id — and coordinates the list and details panel. Everything
 * above this component in the tree stays a server component.
 */
export function TransactionsWorkspace({
  transactions,
}: TransactionsWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedTransaction = useMemo(
    () =>
      selectedId === null
        ? null
        : transactions.find((tx) => tx.id === selectedId) ?? null,
    [selectedId, transactions]
  );

  return (
    <div className="relative flex h-full min-h-0 flex-1">
      <section
        aria-label="Transactions"
        className="flex min-w-0 flex-1 flex-col"
      >
        <header className="flex items-baseline justify-between border-b border-zinc-200/80 bg-white px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Transactions
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {transactions.length}{" "}
              {transactions.length === 1 ? "transaction" : "transactions"}
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <TransactionsList
            transactions={transactions}
            selectedTransactionId={selectedId}
            onSelect={(id) =>
              setSelectedId((current) => (current === id ? null : id))
            }
          />
        </div>
      </section>

      {selectedTransaction && (
        <TransactionDetailsPanel
          key={selectedTransaction.id}
          transaction={selectedTransaction}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
