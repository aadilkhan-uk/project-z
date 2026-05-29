"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";

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
  quantity: string;
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
    taxType: "NONE",
    quantity: "1",
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
  const [publishState, setPublishState] = useState<PublishState>({ status: "idle" });

  useEffect(() => {
    setForm(buildInitialXeroState(invoice, editValues));
    setPublishState({ status: "idle" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.id]);

  const set = (key: keyof XeroFormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setContact = (id: string, name: string) =>
    setForm((prev) => ({ ...prev, contactId: id, contactName: name }));

  const totalAmount =
    editValues["total_amount"] ??
    invoice.fields.find((f) => f.key === "total_amount")?.value ??
    "";

  const unitAmount = parseFloat(totalAmount) || 0;
  const isValid = form.contactId.trim() && form.date && form.accountCode.trim() && unitAmount > 0;

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
          quantity: parseFloat(form.quantity) || 1,
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
        {/* Section: Invoice */}
        <SectionLabel>Invoice</SectionLabel>
        <div className="mb-6 space-y-4">
          {/* Type selector rendered as segmented buttons */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Type
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
          <XeroTextInput
            id="xero-quantity"
            label="Quantity"
            type="number"
            placeholder="1"
            value={form.quantity}
            onChange={set("quantity")}
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
              Unit Amount
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

/* -------------------------------------------------------------------------- */
/*  Contact autocomplete                                                        */
/* -------------------------------------------------------------------------- */

interface XeroContact {
  ContactID: string;
  Name: string;
}

type ContactFetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; contacts: XeroContact[] }
  | { status: "error"; message: string };

function ContactAutocomplete({
  contactId,
  contactName,
  onSelect,
  onCreated,
}: {
  contactId: string;
  contactName: string;
  onSelect: (id: string, name: string) => void;
  onCreated: (id: string, name: string) => void;
}) {
  const [inputValue, setInputValue] = useState(contactName);
  const [fetchState, setFetchState] = useState<ContactFetchState>({ status: "idle" });
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);

  // Keep the display value in sync when the parent clears the form
  useEffect(() => {
    setInputValue(contactName);
  }, [contactName]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchContacts(search: string) {
    setFetchState({ status: "loading" });
    try {
      const res = await fetch(
        `/api/xero/contacts?search=${encodeURIComponent(search)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setFetchState({ status: "error", message: data.error ?? "Failed to load contacts." });
        return;
      }
      setFetchState({ status: "ready", contacts: data.contacts ?? [] });
    } catch {
      setFetchState({ status: "error", message: "Network error loading contacts." });
    }
  }

  function handleFocus() {
    setOpen(true);
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchContacts(inputValue);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    setOpen(true);
    if (contactId) onSelect("", "");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      hasFetchedRef.current = true;
      fetchContacts(val);
    }, 300);
  }

  function handleSelect(contact: XeroContact) {
    setInputValue(contact.Name);
    onSelect(contact.ContactID, contact.Name);
    setOpen(false);
  }

  function handleCreated(id: string, name: string) {
    setShowCreate(false);
    setInputValue(name);
    // Refresh the contact list so the new contact appears next time
    hasFetchedRef.current = false;
    onCreated(id, name);
  }

  const filtered =
    fetchState.status === "ready"
      ? fetchState.contacts.filter((c) =>
          c.Name.toLowerCase().includes(inputValue.toLowerCase())
        )
      : [];

  return (
    <div ref={containerRef} className="relative">
      {/* Label row with + button */}
      <div className="mb-1.5 flex items-center justify-between">
        <label
          htmlFor="xero-contact-name"
          className="text-xs font-medium uppercase tracking-wide text-zinc-400"
        >
          Contact
        </label>
        <button
          type="button"
          onClick={() => { setOpen(false); setShowCreate((v) => !v); }}
          title={showCreate ? "Cancel" : "Create new contact"}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-md transition",
            showCreate
              ? "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              : "text-zinc-400 hover:bg-violet-50 hover:text-violet-600"
          )}
        >
          {showCreate ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
        </button>
      </div>

      {/* Autocomplete input — hidden while create form is open */}
      {!showCreate && (
        <>
          <div className="relative">
            <input
              id="xero-contact-name"
              type="text"
              autoComplete="off"
              value={inputValue}
              placeholder="Search contacts…"
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
              ) : contactId ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-emerald-500" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-zinc-300" aria-hidden>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
                <li className="px-3 py-2 text-xs text-zinc-400">No contacts found</li>
              ) : (
                filtered.map((contact) => (
                  <li
                    key={contact.ContactID}
                    role="option"
                    aria-selected={contact.ContactID === contactId}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(contact);
                    }}
                    className={cn(
                      "cursor-pointer px-3 py-2 text-sm transition",
                      contact.ContactID === contactId
                        ? "bg-violet-50 text-violet-700"
                        : "text-zinc-800 hover:bg-zinc-50"
                    )}
                  >
                    {contact.Name}
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}

      {/* Inline create form */}
      {showCreate && (
        <CreateContactForm
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Create contact inline form                                                 */
/* -------------------------------------------------------------------------- */

type CreateContactState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string };

interface NewContactFields {
  name: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  accountNumber: string;
  isSupplier: boolean;
  isCustomer: boolean;
}

function CreateContactForm({
  onCreated,
  onCancel,
}: {
  onCreated: (id: string, name: string) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<NewContactFields>({
    name: "",
    firstName: "",
    lastName: "",
    emailAddress: "",
    accountNumber: "",
    isSupplier: false,
    isCustomer: false,
  });
  const [state, setState] = useState<CreateContactState>({ status: "idle" });

  const setField =
    <K extends keyof NewContactFields>(key: K) =>
    (value: NewContactFields[K]) =>
      setFields((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.name.trim()) return;
    setState({ status: "loading" });

    try {
      const res = await fetch("/api/xero/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name.trim(),
          firstName: fields.firstName.trim() || undefined,
          lastName: fields.lastName.trim() || undefined,
          emailAddress: fields.emailAddress.trim() || undefined,
          accountNumber: fields.accountNumber.trim() || undefined,
          isSupplier: fields.isSupplier || undefined,
          isCustomer: fields.isCustomer || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Failed to create contact." });
        return;
      }
      onCreated(data.contact.ContactID, data.contact.Name);
    } catch {
      setState({ status: "error", message: "Network error — please try again." });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-3 space-y-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-500">
        New Contact
      </p>

      {/* Name — required */}
      <CreateField label="Name *" id="cc-name">
        <input
          id="cc-name"
          type="text"
          required
          autoFocus
          placeholder="Acme Ltd"
          value={fields.name}
          onChange={(e) => setField("name")(e.target.value)}
          className={createInputCls}
        />
      </CreateField>

      {/* First / Last name row */}
      <div className="grid grid-cols-2 gap-2">
        <CreateField label="First Name" id="cc-first">
          <input
            id="cc-first"
            type="text"
            placeholder="Jane"
            value={fields.firstName}
            onChange={(e) => setField("firstName")(e.target.value)}
            className={createInputCls}
          />
        </CreateField>
        <CreateField label="Last Name" id="cc-last">
          <input
            id="cc-last"
            type="text"
            placeholder="Smith"
            value={fields.lastName}
            onChange={(e) => setField("lastName")(e.target.value)}
            className={createInputCls}
          />
        </CreateField>
      </div>

      {/* Email */}
      <CreateField label="Email" id="cc-email">
        <input
          id="cc-email"
          type="email"
          placeholder="jane@example.com"
          value={fields.emailAddress}
          onChange={(e) => setField("emailAddress")(e.target.value)}
          className={createInputCls}
        />
      </CreateField>

      {/* Account number */}
      <CreateField label="Account Number" id="cc-account">
        <input
          id="cc-account"
          type="text"
          placeholder="e.g. ACC-001"
          value={fields.accountNumber}
          onChange={(e) => setField("accountNumber")(e.target.value)}
          className={createInputCls}
        />
      </CreateField>

      {/* Supplier / Customer toggles */}
      <div className="flex gap-4 pt-0.5">
        <ToggleCheck
          id="cc-supplier"
          label="Supplier"
          checked={fields.isSupplier}
          onChange={setField("isSupplier")}
        />
        <ToggleCheck
          id="cc-customer"
          label="Customer"
          checked={fields.isCustomer}
          onChange={setField("isCustomer")}
        />
      </div>

      {state.status === "error" && (
        <p className="flex items-start gap-1 rounded-md border border-red-100 bg-red-50 px-2 py-1.5 text-[11px] text-red-600">
          <span className="mt-px shrink-0">⚠</span>
          {state.message}
        </p>
      )}

      <div className="flex gap-2 pt-0.5">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!fields.name.trim() || state.status === "loading"}
          className="flex-1 rounded-lg bg-violet-500 px-2 py-1.5 text-xs font-medium text-white shadow-sm shadow-violet-200 transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state.status === "loading" ? "Creating…" : "Create Contact"}
        </button>
      </div>
    </form>
  );
}

const createInputCls = cn(
  "w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none ring-0 transition",
  "focus:border-violet-400 focus:ring-2 focus:ring-violet-100",
  "placeholder:text-zinc-400"
);

function CreateField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleCheck({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-600 select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded accent-violet-500"
      />
      {label}
    </label>
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
