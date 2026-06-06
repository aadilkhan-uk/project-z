"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/components/ui/cn";

interface XeroAccount {
  AccountID: string;
  Code: string;
  Name: string;
  Type: string;
}

type AccountFetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; accounts: XeroAccount[] }
  | { status: "error"; message: string };

export function AccountAutocomplete({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
}) {
  const [fetchState, setFetchState] = useState<AccountFetchState>({ status: "idle" });
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchAccounts() {
    setFetchState({ status: "loading" });
    try {
      const res = await fetch("/api/xero/accounts");
      const data = await res.json();
      if (!res.ok) {
        setFetchState({ status: "error", message: data.error ?? "Failed to load accounts." });
        return;
      }
      setFetchState({ status: "ready", accounts: data.accounts ?? [] });
    } catch {
      setFetchState({ status: "error", message: "Network error loading accounts." });
    }
  }

  function handleFocus() {
    setOpen(true);
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchAccounts();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    setOpen(true);
  }

  function handleSelect(account: XeroAccount) {
    onChange(account.Code);
    setOpen(false);
  }

  const filtered =
    fetchState.status === "ready"
      ? fetchState.accounts.filter((a) => {
          const q = value.toLowerCase();
          return (
            a.Code.toLowerCase().includes(q) ||
            a.Name.toLowerCase().includes(q) ||
            a.Type.toLowerCase().includes(q)
          );
        })
      : [];

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor="xero-account-code"
        className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
      >
        Account Code{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      <div className="relative">
        <input
          id="xero-account-code"
          type="text"
          autoComplete="off"
          value={value}
          placeholder="e.g. 200"
          onFocus={handleFocus}
          onChange={handleChange}
          className={cn(
            "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 pr-8 text-sm text-zinc-900 outline-none ring-0 transition",
            "focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100",
            "placeholder:text-zinc-400"
          )}
        />
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
          {fetchState.status === "loading" ? (
            <svg className="h-3.5 w-3.5 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-zinc-300" aria-hidden>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </span>
      </div>

      {fetchState.status === "error" && (
        <p className="mt-1 text-[11px] text-red-500">{fetchState.message}</p>
      )}

      {open && fetchState.status === "ready" && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-zinc-400">
              {value.trim() ? "No matching accounts — your input will be used as-is." : "No accounts found"}
            </li>
          ) : (
            filtered.map((account) => (
              <li
                key={account.AccountID}
                role="option"
                aria-selected={account.Code === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(account);
                }}
                className={cn(
                  "flex cursor-pointer items-baseline gap-2 px-3 py-2 text-sm transition",
                  account.Code === value
                    ? "bg-violet-50 text-violet-700"
                    : "text-zinc-800 hover:bg-zinc-50"
                )}
              >
                <span className="shrink-0 font-medium tabular-nums">{account.Code}</span>
                <span className="min-w-0 truncate text-zinc-500">{account.Name}</span>
                <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-zinc-300">
                  {account.Type}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
