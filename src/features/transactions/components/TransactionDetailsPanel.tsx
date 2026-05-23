"use client";

import { useEffect } from "react";

import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/components/ui/cn";

import { formatCurrency } from "../lib/formatCurrency";
import { formatFullDate } from "../lib/formatDate";
import type { TransactionListItem } from "../types/transaction";

interface TransactionDetailsPanelProps {
  transaction: TransactionListItem;
  onClose: () => void;
}

/**
 * Right-side details panel.
 *
 * On md+ viewports this sits beside the list; on mobile it slides over as a
 * sheet so the list stays a single column. The Escape key closes the panel.
 */
export function TransactionDetailsPanel({
  transaction,
  onClose,
}: TransactionDetailsPanelProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const {
    merchant,
    description,
    signedAmount,
    currency,
    timestamp,
    direction,
    category,
    classification,
    accountDisplayName,
    runningBalance,
  } = transaction;

  return (
    <aside
      aria-label="Transaction details"
      className={cn(
        "flex h-full w-full flex-col border-l border-zinc-200/80 bg-white",
        // Mobile: full-screen overlay sliding from the right.
        "fixed inset-0 z-40 md:static md:z-auto md:w-[380px] md:shrink-0"
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {direction === "in" ? "Money in" : "Money out"}
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold text-zinc-900">
            {merchant}
          </h2>
        </div>
        <IconButton label="Close details" onClick={onClose}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
          </svg>
        </IconButton>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-3xl font-semibold tabular-nums tracking-tight",
              direction === "in" ? "text-emerald-600" : "text-zinc-900"
            )}
          >
            {formatCurrency(signedAmount, currency, {
              signDisplay: "always",
            })}
          </span>
          <span className="text-xs font-medium text-zinc-400">{currency}</span>
        </div>

        <p className="mt-2 text-sm text-zinc-500">
          <time dateTime={timestamp.toISOString()}>
            {formatFullDate(timestamp)}
          </time>
        </p>

        <dl className="mt-8 grid grid-cols-1 gap-x-6 gap-y-5">
          <DetailField label="Description" value={description} />
          <DetailField label="Category" value={humanizeCategory(category)} />
          <DetailField
            label="Classification"
            value={
              classification.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {classification.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              )
            }
          />
          <DetailField label="Account" value={accountDisplayName} />
          <DetailField
            label="Running balance"
            value={
              runningBalance
                ? formatCurrency(runningBalance.amount, runningBalance.currency)
                : "Not provided"
            }
          />
        </dl>
      </div>
    </aside>
  );
}

interface DetailFieldProps {
  label: string;
  value: React.ReactNode;
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </dt>
      <dd className="text-sm text-zinc-900">{value}</dd>
    </div>
  );
}

function humanizeCategory(category: string): string {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
