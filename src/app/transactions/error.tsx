"use client";

import { useEffect } from "react";

export default function TransactionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Transactions route error:", error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-50/60 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden
        >
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      </div>
      <div>
        <h2 className="text-base font-semibold text-zinc-900">
          We couldn&apos;t load your transactions
        </h2>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          Something went wrong while talking to your bank. Try again, or
          reconnect your account if the issue persists.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-600 active:scale-95"
      >
        Try again
      </button>
    </div>
  );
}
