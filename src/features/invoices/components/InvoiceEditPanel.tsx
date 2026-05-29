"use client";

import type React from "react";
import { useEffect, useState } from "react";

import { cn } from "@/components/ui/cn";
import type { Invoice, InvoiceField } from "../types/invoice";

type PanelTab = "edit" | "xero";

interface InvoiceEditPanelProps {
  invoice: Invoice;
  editValues: Record<string, string>;
  collapsed: boolean;
  onFieldChange: (key: string, value: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  onToggleCollapse: () => void;
}

export function InvoiceEditPanel({
  invoice,
  editValues,
  collapsed,
  onFieldChange,
  onSave,
  onDiscard,
  onToggleCollapse,
}: InvoiceEditPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("edit");

  const isDirty = invoice.fields.some(
    (f) => editValues[f.key] !== undefined && editValues[f.key] !== f.value
  );

  return (
    <aside
      aria-label="Edit invoice details"
      className={cn(
        "flex h-full shrink-0 flex-col border-l border-zinc-200/80 bg-white transition-all duration-200",
        collapsed ? "w-14" : "w-96"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-zinc-200/80 px-3",
          collapsed ? "justify-center" : "justify-between px-5"
        )}
      >
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900">Invoice Details</p>
            <p className="mt-0.5 truncate text-xs text-zinc-400">
              {invoice.fields.length} fields detected
            </p>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand edit panel" : "Collapse edit panel"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
        >
          <CollapseIcon collapsed={collapsed} />
        </button>
      </div>

      {/* Collapsed state: rotated label */}
      {collapsed && (
        <div className="flex flex-1 items-center justify-center">
          <span
            className="select-none text-[10px] font-medium uppercase tracking-widest text-zinc-300"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Invoice Details
          </span>
        </div>
      )}

      {/* Tab bar + content */}
      {!collapsed && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex shrink-0 gap-0 border-b border-zinc-200/80 px-5">
            <TabButton
              active={activeTab === "edit"}
              onClick={() => setActiveTab("edit")}
            >
              Edit Details
            </TabButton>
            <TabButton
              active={activeTab === "xero"}
              onClick={() => setActiveTab("xero")}
            >
              Publish to Xero
            </TabButton>
          </div>

          {/* Tab: Edit Details */}
          {activeTab === "edit" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-4">
                  {invoice.fields.map((field) => (
                    <FieldInput
                      key={field.key}
                      field={field}
                      value={editValues[field.key] ?? field.value}
                      onChange={(val) => onFieldChange(field.key, val)}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="shrink-0 border-t border-zinc-100 px-5 py-4">
                {isDirty && (
                  <p className="mb-3 flex items-center gap-1.5 text-xs text-amber-600">
                    <UnsavedDot />
                    Unsaved changes
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={onDiscard}
                    disabled={!isDirty}
                    className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Discard
                  </button>
                  <button
                    onClick={onSave}
                    disabled={!isDirty}
                    className="flex-1 rounded-lg bg-violet-500 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-violet-200 transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Publish to Xero */}
          {activeTab === "xero" && (
            <XeroPublishForm invoice={invoice} editValues={editValues} />
          )}
        </div>
      )}
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/*  Xero publish form                                                          */
/* -------------------------------------------------------------------------- */

const XERO_STATUSES = ["DRAFT", "SUBMITTED", "AUTHORISED"] as const;
const XERO_TAX_TYPES = ["NONE", "EXCLUSIVE", "INCLUSIVE", "EXEMPTINPUT", "EXEMPTOUTPUT"] as const;

interface XeroFormState {
  contactId: string;
  date: string;
  dueDate: string;
  reference: string;
  status: string;
  lineDescription: string;
  accountCode: string;
  taxType: string;
}

function buildInitialXeroState(
  invoice: Invoice,
  editValues: Record<string, string>
): XeroFormState {
  const get = (key: string) =>
    editValues[key] ?? invoice.fields.find((f) => f.key === key)?.value ?? "";

  return {
    contactId: "",
    date: get("invoice_date"),
    dueDate: get("due_date"),
    reference: get("invoice_number"),
    status: "DRAFT",
    lineDescription: get("vendor_name") || invoice.vendor || "",
    accountCode: "",
    taxType: "NONE",
  };
}

function XeroPublishForm({
  invoice,
  editValues,
}: {
  invoice: Invoice;
  editValues: Record<string, string>;
}) {
  const [form, setForm] = useState<XeroFormState>(() =>
    buildInitialXeroState(invoice, editValues)
  );

  useEffect(() => {
    setForm(buildInitialXeroState(invoice, editValues));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.id]);

  const set = (key: keyof XeroFormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const totalAmount =
    editValues["total_amount"] ??
    invoice.fields.find((f) => f.key === "total_amount")?.value ??
    "";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Section: Invoice */}
        <SectionLabel>Invoice</SectionLabel>
        <div className="mb-6 space-y-4">
          <XeroTextInput
            id="xero-contact-id"
            label="Contact ID"
            placeholder="e.g. 305ca5cf-497d-4fee-a161-cdb30e6be989"
            value={form.contactId}
            onChange={set("contactId")}
          />
          <XeroTextInput
            id="xero-date"
            label="Invoice Date"
            type="date"
            value={form.date}
            onChange={set("date")}
          />
          <XeroTextInput
            id="xero-due-date"
            label="Due Date"
            type="date"
            value={form.dueDate}
            onChange={set("dueDate")}
          />
          <XeroTextInput
            id="xero-reference"
            label="Reference"
            placeholder="e.g. INV-001"
            value={form.reference}
            onChange={set("reference")}
          />
          <XeroSelect
            id="xero-status"
            label="Status"
            value={form.status}
            options={XERO_STATUSES}
            onChange={set("status")}
          />
        </div>

        {/* Section: Line Item */}
        <SectionLabel>Line Item</SectionLabel>
        <div className="space-y-4">
          <XeroTextInput
            id="xero-line-description"
            label="Description"
            placeholder="e.g. Invoice from Acme Ltd"
            value={form.lineDescription}
            onChange={set("lineDescription")}
          />
          <XeroTextInput
            id="xero-account-code"
            label="Account Code"
            placeholder="e.g. 200"
            value={form.accountCode}
            onChange={set("accountCode")}
          />
          <XeroSelect
            id="xero-tax-type"
            label="Tax Type"
            value={form.taxType}
            options={XERO_TAX_TYPES}
            onChange={set("taxType")}
          />
          {/* Total amount — read-only, sourced from the invoice */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Amount
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
                £
              </span>
              <input
                type="text"
                readOnly
                value={totalAmount}
                tabIndex={-1}
                className="w-full cursor-default rounded-lg border border-zinc-200 bg-zinc-100 py-2 pl-7 pr-3 text-sm text-zinc-500 outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Pulled from total amount — edit in the Details tab.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-zinc-100 px-5 py-4">
        <button
          disabled={!form.contactId.trim()}
          className="w-full rounded-lg bg-[#13B5EA] px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0fa3d4] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Publish to Xero
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
      {children}
    </p>
  );
}

function XeroTextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
      >
        {label}
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
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
      >
        {label}
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
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tab button                                                                 */
/* -------------------------------------------------------------------------- */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative -mb-px shrink-0 px-1 pb-3 pt-3 text-xs font-medium transition",
        "mr-5 last:mr-0",
        active
          ? "border-b-2 border-violet-500 text-violet-600"
          : "border-b-2 border-transparent text-zinc-400 hover:text-zinc-600"
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Field input                                                                */
/* -------------------------------------------------------------------------- */

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: InvoiceField;
  value: string;
  onChange: (val: string) => void;
}) {
  const inputType =
    field.type === "date"
      ? "date"
      : field.type === "currency" || field.type === "number"
        ? "number"
        : "text";

  return (
    <div>
      <label
        htmlFor={`field-${field.key}`}
        className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
      >
        {field.label}
      </label>
      <div className="relative">
        {field.type === "currency" && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
            £
          </span>
        )}
        <input
          id={`field-${field.key}`}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step={field.type === "currency" ? "0.01" : undefined}
          className={cn(
            "w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 text-sm text-zinc-900 outline-none ring-0 transition",
            "focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100",
            "placeholder:text-zinc-400",
            field.type === "currency" ? "pl-7 pr-3" : "px-3"
          )}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Icons                                                                      */
/* -------------------------------------------------------------------------- */

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      {collapsed ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  );
}

function UnsavedDot() {
  return (
    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
  );
}
