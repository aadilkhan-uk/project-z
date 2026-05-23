"use client";

import { cn } from "@/components/ui/cn";

import { formatCurrency } from "../lib/formatCurrency";
import { formatShortDate } from "../lib/formatDate";
import type { TransactionListItem } from "../types/transaction";

interface TransactionRowProps {
  transaction: TransactionListItem;
  selected: boolean;
  onSelect: (id: string) => void;
}

/**
 * Single row in the transactions list.
 *
 * Intentionally presentational: receives data + handlers, owns no state.
 * Selection styling is driven entirely by the `selected` prop.
 */
export function TransactionRow({
  transaction,
  selected,
  onSelect,
}: TransactionRowProps) {
  const { id, merchant, signedAmount, currency, timestamp, direction } =
    transaction;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(id)}
        aria-pressed={selected}
        className={cn(
          "group flex w-full items-center gap-4 px-5 py-3.5 text-left transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400",
          selected
            ? "bg-violet-50/70"
            : "hover:bg-zinc-50"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            direction === "in" ? "bg-emerald-500" : "bg-rose-500"
          )}
        />

        <time
          dateTime={timestamp.toISOString()}
          className="w-32 shrink-0 text-xs font-medium tabular-nums text-zinc-500"
        >
          {formatShortDate(timestamp)}
        </time>

        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">
          {merchant}
        </span>

        <span
          className={cn(
            "shrink-0 text-sm font-semibold tabular-nums",
            direction === "in" ? "text-emerald-600" : "text-zinc-900"
          )}
        >
          {formatCurrency(signedAmount, currency, { signDisplay: "always" })}
        </span>
      </button>
    </li>
  );
}
