"use client";

import { useEffect, useState } from "react";

import { cn } from "@/components/ui/cn";
import type { Invoice } from "../types/invoice";
import { AccountAutocomplete } from "./AccountAutocomplete";
import { ContactAutocomplete } from "./ContactAutocomplete";

const XERO_STATUSES = ["DRAFT", "SUBMITTED", "AUTHORISED"] as const;
const XERO_TAX_TYPES = ["NONE", "EXCLUSIVE", "INCLUSIVE", "EXEMPTINPUT", "EXEMPTOUTPUT"] as const;
const XERO_TYPES = [
  { value: "ACCPAY", label: "Bill (ACCPAY)" },
  { value: "ACCREC", label: "Sales Invoice (ACCREC)" },
] as const;

type PublishState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; invoiceId: string; invoiceNumber: string }
  | { status: "error"; message: string };

interface XeroFormState {
  type: string;
  contactId: string;
  contactName: string;
  date: string;
  dueDate: string;
  reference: string;
  status: string;
  lineDescription: string;
  accountCode: string;
  taxType: string;
  total: string;
}

function buildInitialXeroState(
  invoice: Invoice,
  editValues: Record<string, string>
): XeroFormState {
  const get = (key: string) =>
    editValues[key] ?? invoice.fields.find((f) => f.key === key)?.value ?? "";

  return {
    type: "ACCPAY",
    contactId: "",
    contactName: "",
    date: get("invoice_date"),
    dueDate: get("due_date"),
    reference: get("invoice_number"),
    status: "DRAFT",
    lineDescription: get("vendor_name") || invoice.vendor || "",
    accountCode: "",
    taxType: "",
    total: get("total_amount") || "",
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
      {children}
    </p>
  );
}

function RequiredStar() {
  return <span className="ml-0.5 text-red-400">*</span>;
}

function XeroTextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
      >
        {label}{required && <RequiredStar />}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-0 transition",
          "focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100",
          "placeholder:text-zinc-400"
        )}
      />
    </div>
  );
}

function XeroSelect({
  id,
  label,
  value,
  options,
  onChange,
  required,
  includeBlank,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  required?: boolean;
  includeBlank?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
      >
        {label}{required && <RequiredStar />}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-0 transition",
          "focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
        )}
      >
        {includeBlank && <option value="">— select —</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function XeroPublishForm({
  invoice,
  editValues,
}: {
  invoice: Invoice;
  editValues: Record<string, string>;
}) {
  const [form, setForm] = useState<XeroFormState>(() =>
    buildInitialXeroState(invoice, editValues)
  );
  const [publishState, setPublishState] = useState<PublishState>({ status: "idle" });

  useEffect(() => {
    setForm(buildInitialXeroState(invoice, editValues));
    setPublishState({ status: "idle" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.id]);

  // Backfill the total field if it was empty at mount time (e.g. editValues
  // arrived after initial render following async extraction).
  const sourceTotal =
    editValues["total_amount"] ??
    invoice.fields.find((f) => f.key === "total_amount")?.value ??
    "";
  useEffect(() => {
    if (sourceTotal) {
      setForm((prev) => (prev.total ? prev : { ...prev, total: sourceTotal }));
    }
  }, [sourceTotal]);

  const set = (key: keyof XeroFormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setContact = (id: string, name: string) =>
    setForm((prev) => ({ ...prev, contactId: id, contactName: name }));

  const unitAmount = parseFloat(form.total) || 0;
  const isValid =
    form.contactId.trim() &&
    form.date &&
    form.dueDate &&
    form.reference.trim() &&
    form.lineDescription.trim() &&
    form.accountCode.trim() &&
    form.total.trim() &&
    unitAmount > 0;

  async function handlePublish() {
    if (!isValid) return;
    setPublishState({ status: "loading" });

    try {
      const res = await fetch("/api/xero/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          contactId: form.contactId.trim(),
          date: form.date,
          dueDate: form.dueDate,
          reference: form.reference,
          status: form.status,
          lineDescription: form.lineDescription,
          accountCode: form.accountCode.trim(),
          taxType: form.taxType,
          quantity: 1,
          unitAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPublishState({ status: "error", message: data.error ?? "Unknown error." });
        return;
      }

      setPublishState({
        status: "success",
        invoiceId: data.invoiceId ?? "",
        invoiceNumber: data.invoiceNumber ?? "",
      });
    } catch {
      setPublishState({ status: "error", message: "Network error — please try again." });
    }
  }

  if (publishState.status === "success") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-500" aria-hidden>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">Published to Xero</p>
          {publishState.invoiceNumber && (
            <p className="mt-1 text-xs text-zinc-500">
              Invoice #{publishState.invoiceNumber}
            </p>
          )}
        </div>
        <button
          onClick={() => setPublishState({ status: "idle" })}
          className="text-xs text-zinc-400 underline underline-offset-2 transition hover:text-zinc-600"
        >
          Publish another
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <SectionLabel>Invoice</SectionLabel>
        <div className="mb-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Type<RequiredStar />
            </label>
            <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
              {XERO_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set("type")(t.value)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                    form.type === t.value
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <ContactAutocomplete
            contactId={form.contactId}
            contactName={form.contactName}
            onSelect={setContact}
            onCreated={(id, name) => {
              setContact(id, name);
            }}
            required
          />
          <XeroTextInput
            id="xero-date"
            label="Invoice Date"
            type="date"
            value={form.date}
            onChange={set("date")}
            required
          />
          <XeroTextInput
            id="xero-due-date"
            label="Due Date"
            type="date"
            value={form.dueDate}
            onChange={set("dueDate")}
            required
          />
          <XeroTextInput
            id="xero-reference"
            label="Reference"
            placeholder="e.g. INV-001"
            value={form.reference}
            onChange={set("reference")}
            required
          />
          <XeroSelect
            id="xero-status"
            label="Status"
            value={form.status}
            options={XERO_STATUSES}
            onChange={set("status")}
            required
          />
        </div>

        <SectionLabel>Totals</SectionLabel>
        <div className="space-y-4">
          <XeroTextInput
            id="xero-line-description"
            label="Description"
            placeholder="e.g. Invoice from Acme Ltd"
            value={form.lineDescription}
            onChange={set("lineDescription")}
            required
          />
          <AccountAutocomplete
            value={form.accountCode}
            onChange={set("accountCode")}
            required
          />
          <XeroSelect
            id="xero-tax-type"
            label="Tax Type"
            value={form.taxType}
            options={XERO_TAX_TYPES}
            onChange={set("taxType")}
            includeBlank
          />
          <div>
            <label
              htmlFor="xero-total"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
            >
              Total<RequiredStar />
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
                £
              </span>
              <input
                id="xero-total"
                type="number"
                value={form.total}
                onChange={(e) => set("total")(e.target.value)}
                placeholder="0.00"
                className={cn(
                  "w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-7 pr-3 text-sm text-zinc-900 outline-none ring-0 transition",
                  "focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100",
                  "placeholder:text-zinc-400"
                )}
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Pre-filled from the Details tab — override if needed.
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-zinc-100 px-5 py-4 space-y-3">
        {publishState.status === "error" && (
          <p className="flex items-start gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
            <span className="mt-px shrink-0">⚠</span>
            {publishState.message}
          </p>
        )}
        <button
          onClick={handlePublish}
          disabled={!isValid || publishState.status === "loading"}
          className="w-full rounded-lg bg-[#13B5EA] px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0fa3d4] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {publishState.status === "loading" ? "Publishing…" : "Publish to Xero"}
        </button>
      </div>
    </div>
  );
}
