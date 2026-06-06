"use client";

import Link from "next/link";
import { useRef } from "react";

import { cn } from "@/components/ui/cn";
import type { Invoice, InvoiceStatus } from "../types/invoice";

interface InvoiceListProps {
  invoices: Invoice[];
  selectedId: string | null;
  collapsed: boolean;
  gmailConnected: boolean;
  syncActive: boolean;
  onSelect: (id: string) => void;
  onUpload: (file: File) => void;
  onToggleSync: () => void;
  onToggleCollapse: () => void;
}

export function InvoiceList({
  invoices,
  selectedId,
  collapsed,
  gmailConnected,
  syncActive,
  onSelect,
  onUpload,
  onToggleSync,
  onToggleCollapse,
}: InvoiceListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = "";
    }
  }

  return (
    <aside
      aria-label="Invoice list"
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-zinc-200/80 bg-white transition-all duration-200",
        collapsed ? "w-14" : "w-72"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.docx"
        className="sr-only"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-zinc-200/80 px-3",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <span className="text-sm font-semibold text-zinc-900">Invoices</span>
        )}
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand invoice list" : "Collapse invoice list"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
        >
          <CollapseIcon collapsed={collapsed} />
        </button>
      </div>

      {/* Upload button */}
      <div className={cn("shrink-0 p-3 pb-2", collapsed && "flex justify-center")}>
        {collapsed ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload invoice"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white shadow-sm shadow-violet-200 transition hover:bg-violet-600"
          >
            <UploadIcon />
          </button>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-violet-200 transition hover:bg-violet-600"
          >
            <UploadIcon />
            Upload Invoice
          </button>
        )}
      </div>

      {/* Mailbox sync */}
      {!collapsed && (
        <div className="shrink-0 px-3 pb-3">
          {gmailConnected ? (
            <div
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 transition",
                syncActive
                  ? "border-sky-100 bg-sky-50"
                  : "border-zinc-200 bg-white"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2 text-sm font-medium",
                  syncActive ? "text-sky-600" : "text-zinc-600"
                )}
              >
                <SyncIcon spinning={syncActive} />
                {syncActive ? "Syncing mailbox…" : "Mailbox sync"}
              </div>
              <button
                role="switch"
                aria-checked={syncActive}
                aria-label="Toggle mailbox sync"
                onClick={onToggleSync}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1",
                  syncActive ? "bg-sky-500" : "bg-zinc-300"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200",
                    syncActive ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          ) : (
            <Link
              href="/mailbox"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
            >
              <MailIcon />
              Connect Gmail to sync
            </Link>
          )}
        </div>
      )}

      {/* Collapsed mailbox sync icon */}
      {collapsed && (
        <div className="flex shrink-0 justify-center pb-2">
          {gmailConnected ? (
            <button
              onClick={onToggleSync}
              aria-label={syncActive ? "Stop mailbox sync" : "Start mailbox sync"}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition",
                syncActive
                  ? "bg-sky-500 text-white"
                  : "border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100"
              )}
            >
              <SyncIcon spinning={syncActive} />
            </button>
          ) : (
            <Link
              href="/mailbox"
              aria-label="Connect Gmail"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-400 transition hover:bg-zinc-100"
            >
              <MailIcon />
            </Link>
          )}
        </div>
      )}

      {/* Invoice items */}
      <ul className="flex-1 overflow-y-auto px-2 pb-2">
        {invoices.map((invoice) => (
          <li key={invoice.id}>
            <button
              onClick={() => onSelect(invoice.id)}
              aria-current={selectedId === invoice.id ? "true" : undefined}
              className={cn(
                "group flex w-full items-start gap-3 rounded-xl px-2 py-3 text-left transition",
                selectedId === invoice.id
                  ? invoice.source === "email"
                    ? "bg-sky-50"
                    : "bg-violet-50"
                  : invoice.source === "email"
                    ? "hover:bg-sky-50/60"
                    : "hover:bg-zinc-50"
              )}
            >
              <div className="mt-0.5 shrink-0">
                {invoice.source === "email" ? (
                  <MailIcon />
                ) : (
                  <FileIcon status={invoice.status} />
                )}
              </div>

              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium leading-tight",
                      selectedId === invoice.id
                        ? invoice.source === "email"
                          ? "text-sky-700"
                          : "text-violet-700"
                        : "text-zinc-800"
                    )}
                  >
                    {invoice.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-400">
                    {invoice.vendor}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-zinc-400">
                      {formatUploadDate(invoice.uploadedAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      {invoice.source === "email" && <MailboxBadge />}
                      <StatusBadge status={invoice.status} />
                    </div>
                  </div>
                </div>
              )}
            </button>
          </li>
        ))}

        {invoices.length === 0 && !collapsed && (
          <li className="px-2 py-8 text-center text-xs text-zinc-400">
            No invoices yet
          </li>
        )}
      </ul>
    </aside>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
        Ready
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
        Processing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
      Error
    </span>
  );
}

function FileIcon({ status }: { status: InvoiceStatus }) {
  const color =
    status === "ready"
      ? "text-violet-500"
      : status === "processing"
        ? "text-amber-400"
        : "text-red-400";

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4 shrink-0", color)}
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 transition-transform duration-200"
      aria-hidden
    >
      {collapsed ? (
        <polyline points="9 18 15 12 9 6" />
      ) : (
        <polyline points="15 18 9 12 15 6" />
      )}
    </svg>
  );
}

function MailboxBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-600">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-2.5 w-2.5"
        aria-hidden
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
      Mailbox
    </span>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-sky-500"
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function SyncIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-3.5 w-3.5 shrink-0", spinning && "animate-spin")}
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function formatUploadDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
