"use client";

import { useRef, useState } from "react";

import { cn } from "@/components/ui/cn";
import type { Invoice } from "../types/invoice";

interface InvoicePreviewProps {
  invoice: Invoice | null;
  onUpload: (file: File) => void;
}

export function InvoicePreview({ invoice, onUpload }: InvoicePreviewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }

  return (
    <section
      aria-label="Invoice preview"
      className="flex min-w-0 flex-1 flex-col bg-zinc-50/60"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="sr-only"
        onChange={handleFileChange}
      />

      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white px-6">
        <div>
          <h1 className="text-sm font-semibold text-zinc-900">
            {invoice ? invoice.name : "Invoice Preview"}
          </h1>
          {invoice && (
            <p className="mt-0.5 text-xs text-zinc-400">{invoice.vendor}</p>
          )}
        </div>

        {invoice && invoice.source !== "email" && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            <UploadIcon />
            Upload new
          </button>
        )}
      </header>

      {/* Body */}
      <div
        className={cn(
          "flex flex-1 overflow-hidden",
          !invoice?.fileUrl && "items-center justify-center p-6",
        )}
      >
        {!invoice ? (
          <DropZone
            dragging={dragging}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          />
        ) : invoice.source === "email" ? (
          invoice.emailBody ? (
            <EmailBodyPreview subject={invoice.name} body={invoice.emailBody} />
          ) : (
            <EmailAttachmentPreview
              subject={invoice.name}
              filename={invoice.emailAttachmentName ?? "attachment"}
            />
          )
        ) : invoice.fileUrl ? (
          <FileViewer
            invoice={invoice}
            onRetry={() => fileInputRef.current?.click()}
          />
        ) : invoice.status === "processing" ? (
          <ProcessingState name={invoice.name} />
        ) : invoice.status === "error" ? (
          <ErrorState name={invoice.name} onRetry={() => fileInputRef.current?.click()} />
        ) : (
          <InvoiceDocument invoice={invoice} />
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Drop zone                                                                  */
/* -------------------------------------------------------------------------- */

function DropZone({
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
}: {
  dragging: boolean;
  onDragOver: React.DragEventHandler;
  onDragLeave: React.DragEventHandler;
  onDrop: React.DragEventHandler;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex w-full max-w-lg cursor-pointer flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed px-8 py-16 text-center transition",
        dragging
          ? "border-violet-400 bg-violet-50"
          : "border-zinc-200 bg-white hover:border-violet-300 hover:bg-violet-50/40"
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
        <DocumentUploadIcon />
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-800">
          Drop your invoice here
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          or click to browse · PDF, PNG, JPG supported
        </p>
      </div>
      <span className="inline-flex items-center rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-200 transition hover:bg-violet-600">
        Choose file
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Processing state                                                           */
/* -------------------------------------------------------------------------- */

function ProcessingState({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
        <svg
          className="h-7 w-7 animate-spin text-amber-400"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-800">Processing invoice</p>
        <p className="mt-1 max-w-xs text-sm text-zinc-400">
          Extracting data from{" "}
          <span className="font-medium text-zinc-600">{name}</span>. This
          usually takes a few seconds.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Error state                                                                */
/* -------------------------------------------------------------------------- */

function ErrorState({ name, onRetry }: { name: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-800">
          Could not process invoice
        </p>
        <p className="mt-1 max-w-xs text-sm text-zinc-400">
          We couldn&apos;t extract data from{" "}
          <span className="font-medium text-zinc-600">{name}</span>. Try
          uploading a clearer version.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
      >
        Upload again
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  File viewer (actual PDF / image)                                          */
/* -------------------------------------------------------------------------- */

function FileViewer({
  invoice,
  onRetry,
}: {
  invoice: Invoice;
  onRetry: () => void;
}) {
  const isPdf = invoice.fileMimeType === "application/pdf";

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Processing banner */}
      {invoice.status === "processing" && (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-amber-100 bg-amber-50 px-5 py-2.5">
          <svg
            className="h-4 w-4 animate-spin text-amber-400"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-xs font-medium text-amber-700">
            Extracting invoice data… this usually takes a few seconds.
          </span>
        </div>
      )}

      {/* Error banner */}
      {invoice.status === "error" && (
        <div className="flex shrink-0 items-center justify-between border-b border-red-100 bg-red-50 px-5 py-2.5">
          <div className="flex items-center gap-2.5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-red-400"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-xs font-medium text-red-700">
              Could not extract data from this file.
            </span>
          </div>
          <button
            onClick={onRetry}
            className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-50"
          >
            Upload again
          </button>
        </div>
      )}

      {/* PDF viewer */}
      {isPdf ? (
        <iframe
          src={invoice.fileUrl}
          title={invoice.name}
          className="flex-1 border-0"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center overflow-auto p-6">
          <img
            src={invoice.fileUrl}
            alt={invoice.name}
            className="max-h-full max-w-full rounded-xl object-contain shadow-md"
          />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Invoice document mock preview                                              */
/* -------------------------------------------------------------------------- */

function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const getField = (key: string) =>
    invoice.fields.find((f) => f.key === key)?.value ?? "—";

  return (
    <div className="w-full max-w-2xl">
      {/* Paper card */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-[0_4px_24px_rgba(15,15,30,0.06)]">
        {/* Document header */}
        <div className="flex items-start justify-between border-b border-zinc-100 px-8 py-7">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
              <span className="text-sm font-bold text-zinc-500">
                {invoice.vendor.charAt(0)}
              </span>
            </div>
            <p className="mt-3 text-base font-bold text-zinc-900">
              {getField("vendor")}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">Vendor</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Invoice
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-zinc-900">
              {getField("invoice_number")}
            </p>
          </div>
        </div>

        {/* Date row */}
        <div className="grid grid-cols-3 gap-px border-b border-zinc-100 bg-zinc-100">
          <DateCell label="Invoice Date" value={getField("invoice_date")} />
          <DateCell label="Due Date" value={getField("due_date")} />
          <DateCell label="PO Number" value={getField("po_number")} />
        </div>

        {/* Line items placeholder */}
        <div className="px-8 py-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Line Items
          </p>
          <div className="space-y-2.5">
            {[
              { desc: "Cloud compute (EC2, us-east-1)", qty: "1", amount: "$2,400.00" },
              { desc: "Data transfer & bandwidth", qty: "1", amount: "$840.00" },
              { desc: "S3 storage (500 GB)", qty: "1", amount: "$600.00" },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-700">{row.desc}</p>
                </div>
                <div className="ml-4 shrink-0 text-right">
                  <p className="text-sm font-medium tabular-nums text-zinc-800">
                    {row.amount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-zinc-100 px-8 py-5">
          <div className="ml-auto w-56 space-y-2">
            <TotalRow label="Subtotal" value={`£${getField("subtotal")}`} />
            <TotalRow label="Tax" value={`£${getField("tax")}`} />
            <div className="border-t border-zinc-200 pt-2">
              <TotalRow
                label="Total"
                value={`£${getField("total")}`}
                bold
              />
            </div>
          </div>
        </div>

        {/* Footer watermark */}
        <div className="flex items-center justify-center border-t border-zinc-100 py-4">
          <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-300">
            Preview · Project Z
          </span>
        </div>
      </div>
    </div>
  );
}

function DateCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-6 py-4">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-zinc-800">{value}</p>
    </div>
  );
}

function TotalRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={cn(
          "text-sm",
          bold ? "font-semibold text-zinc-900" : "text-zinc-500"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          bold
            ? "text-base font-bold text-zinc-900"
            : "text-sm text-zinc-700"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Email body preview                                                         */
/* -------------------------------------------------------------------------- */

function EmailBodyPreview({ subject, body }: { subject: string; body: string }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-sky-100 bg-sky-50 px-5 py-2.5">
        <MailIcon className="h-4 w-4 text-sky-500" />
        <span className="text-xs font-medium text-sky-700">
          Invoice extracted from email body
        </span>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Email content
        </p>
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-zinc-700">
          {body}
        </pre>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Email attachment preview                                                   */
/* -------------------------------------------------------------------------- */

function EmailAttachmentPreview({
  subject,
  filename,
}: {
  subject: string;
  filename: string;
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-sky-100 bg-sky-50 px-5 py-2.5">
        <MailIcon className="h-4 w-4 text-sky-500" />
        <span className="text-xs font-medium text-sky-700">
          Invoice extracted from email attachment
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-500">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
              aria-hidden
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="13" y2="17" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-800">
              Extracted from attachment
            </p>
            <p className="mt-1 max-w-xs rounded-md bg-zinc-100 px-3 py-1.5 font-mono text-xs text-zinc-600">
              {filename}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Icons                                                                      */
/* -------------------------------------------------------------------------- */

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function DocumentUploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <polyline points="9 15 12 12 15 15" />
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
