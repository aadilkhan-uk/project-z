"use client";

import { useRef } from "react";

import { cn } from "@/components/ui/cn";
import type { Invoice, InvoiceStatus } from "../types/invoice";

interface InvoiceListProps {
  invoices: Invoice[];
  selectedId: string | null;
  collapsed: boolean;
  onSelect: (id: string) => void;
  onUpload: (file: File) => void;
  onToggleCollapse: () => void;
}

export function InvoiceList({
  invoices,
  selectedId,
  collapsed,
  onSelect,
  onUpload,
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
        accept=".pdf,.png,.jpg,.jpeg,.webp"
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
      <div className={cn("shrink-0 p-3", collapsed && "flex justify-center")}>
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
                  ? "bg-violet-50"
                  : "hover:bg-zinc-50"
              )}
            >
              <div className="mt-0.5 shrink-0">
                <FileIcon status={invoice.status} />
              </div>

              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium leading-tight",
                      selectedId === invoice.id
                        ? "text-violet-700"
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
                    <StatusBadge status={invoice.status} />
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

function formatUploadDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
