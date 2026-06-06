"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { GmailEmail } from "@/app/api/gmail/emails/route";
import { MOCK_INVOICES } from "../lib/mockInvoices";
import type { Invoice } from "../types/invoice";
import { InvoiceEditPanel } from "./InvoiceEditPanel";
import { InvoiceList } from "./InvoiceList";
import { InvoicePreview } from "./InvoicePreview";

const POLL_INTERVAL_MS = 15 * 60 * 1000;

const INITIAL_INVOICES: Invoice[] =
  process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true" ? MOCK_INVOICES : [];

function gmailEmailToInvoice(email: GmailEmail): Invoice | null {
  const data = email.extractedInvoice;
  if (!data) return null;

  const vendor = data.vendor?.name ?? "Unknown Vendor";
  const fields: Invoice["fields"] = (
    [
      { key: "vendor_name", label: "Vendor", value: vendor, type: "text" },
      { key: "invoice_number", label: "Invoice Number", value: data.invoice_number ?? "", type: "text" },
      { key: "invoice_date", label: "Invoice Date", value: data.invoice_date ?? "", type: "date" },
      { key: "due_date", label: "Due Date", value: data.due_date ?? "", type: "date" },
      { key: "vendor_address", label: "Vendor Address", value: data.vendor?.address ?? "", type: "text" },
      { key: "vendor_email", label: "Vendor Email", value: data.vendor?.email ?? "", type: "text" },
      { key: "vendor_phone", label: "Vendor Phone", value: data.vendor?.phone ?? "", type: "text" },
      { key: "vendor_tax_id", label: "Vendor Tax ID", value: data.vendor?.tax_id ?? "", type: "text" },
      { key: "bill_to_name", label: "Bill To", value: data.bill_to?.name ?? "", type: "text" },
      { key: "bill_to_address", label: "Bill To Address", value: data.bill_to?.address ?? "", type: "text" },
      { key: "bill_to_email", label: "Bill To Email", value: data.bill_to?.email ?? "", type: "text" },
      { key: "currency", label: "Currency", value: data.currency ?? "", type: "text" },
      { key: "payment_terms", label: "Payment Terms", value: data.payment_terms ?? "", type: "text" },
      { key: "subtotal", label: "Subtotal", value: String(data.subtotal ?? ""), type: "currency" },
      { key: "tax_rate", label: "Tax Rate (%)", value: String(data.tax_rate ?? ""), type: "number" },
      { key: "tax_amount", label: "Tax Amount", value: String(data.tax_amount ?? ""), type: "currency" },
      { key: "discount", label: "Discount", value: String(data.discount ?? ""), type: "currency" },
      { key: "total_amount", label: "Total Amount", value: String(data.total_amount ?? ""), type: "currency" },
      { key: "notes", label: "Notes", value: data.notes ?? "", type: "text" },
    ] as Invoice["fields"]
  ).filter((f) => f.value !== "" && f.value !== "null" && f.value !== "undefined");

  const invoice: Invoice = {
    id: `email-${email.id}`,
    name: email.subject || "(No subject)",
    vendor,
    uploadedAt: new Date(email.date || Date.now()),
    status: "ready",
    fields,
    source: "email",
  };

  if (email.extractionSource === "body") {
    invoice.emailBody = email.body;
  } else if (email.extractionSource === "attachment") {
    invoice.emailAttachmentName = email.extractionAttachmentName;
  }

  return invoice;
}

/**
 * Client boundary for the invoices explorer.
 *
 * Owns all interactive state: the list of invoices, which one is selected,
 * collapse states for both side panels, and the in-progress edit values for
 * the right-hand form. Everything above this in the tree stays a server component.
 */
export function InvoicesWorkspace({ gmailConnected }: { gmailConnected: boolean }) {
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const seenEmailIds = useRef<Set<string>>(new Set());

  const selectedInvoice =
    selectedId === null
      ? null
      : (invoices.find((inv) => inv.id === selectedId) ?? null);

  const showEditPanel =
    selectedInvoice !== null && selectedInvoice.status === "ready";

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId((current) => {
        if (current === id) return null;
        const invoice = invoices.find((inv) => inv.id === id);
        if (invoice) {
          setEditValues(
            Object.fromEntries(invoice.fields.map((f) => [f.key, f.value]))
          );
        }
        return id;
      });
    },
    [invoices]
  );

  const handleUpload = useCallback((file: File) => {
    const id = `inv-${Date.now()}`;
    const newInvoice: Invoice = {
      id,
      name: file.name,
      vendor: "Processing…",
      uploadedAt: new Date(),
      status: "processing",
      fields: [],
      fileUrl: URL.createObjectURL(file),
      fileMimeType: file.type,
      source: "upload",
    };
    setInvoices((prev) => [newInvoice, ...prev]);
    setSelectedId(id);
    setEditValues({});

    const body = new FormData();
    body.append("file", file);

    fetch("/api/invoice-extractor", { method: "POST", body })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const rawVendor =
          typeof data.vendor === "object" && data.vendor !== null
            ? data.vendor.name
            : data.vendor;
        const vendor =
          typeof rawVendor === "string" && rawVendor.trim()
            ? rawVendor
            : "Unknown Vendor";
        const fields: Invoice["fields"] = (
          [
            { key: "vendor_name", label: "Vendor", value: vendor, type: "text" },
            { key: "invoice_number", label: "Invoice Number", value: data.invoice_number ?? "", type: "text" },
            { key: "invoice_date", label: "Invoice Date", value: data.invoice_date ?? "", type: "date" },
            { key: "due_date", label: "Due Date", value: data.due_date ?? "", type: "date" },
            { key: "vendor_address", label: "Vendor Address", value: data.vendor?.address ?? "", type: "text" },
            { key: "vendor_email", label: "Vendor Email", value: data.vendor?.email ?? "", type: "text" },
            { key: "vendor_phone", label: "Vendor Phone", value: data.vendor?.phone ?? "", type: "text" },
            { key: "vendor_tax_id", label: "Vendor Tax ID", value: data.vendor?.tax_id ?? "", type: "text" },
            { key: "bill_to_name", label: "Bill To", value: data.bill_to?.name ?? "", type: "text" },
            { key: "bill_to_address", label: "Bill To Address", value: data.bill_to?.address ?? "", type: "text" },
            { key: "bill_to_email", label: "Bill To Email", value: data.bill_to?.email ?? "", type: "text" },
            { key: "currency", label: "Currency", value: data.currency ?? "", type: "text" },
            { key: "payment_terms", label: "Payment Terms", value: data.payment_terms ?? "", type: "text" },
            { key: "subtotal", label: "Subtotal", value: String(data.subtotal ?? ""), type: "currency" },
            { key: "tax_rate", label: "Tax Rate (%)", value: String(data.tax_rate ?? ""), type: "number" },
            { key: "tax_amount", label: "Tax Amount", value: String(data.tax_amount ?? ""), type: "currency" },
            { key: "discount", label: "Discount", value: String(data.discount ?? ""), type: "currency" },
            { key: "total_amount", label: "Total Amount", value: String(data.total_amount ?? ""), type: "currency" },
            { key: "notes", label: "Notes", value: data.notes ?? "", type: "text" },
          ] as Invoice["fields"]
        ).filter((f) => f.value !== "" && f.value !== "null" && f.value !== "undefined");

        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === id ? { ...inv, vendor, status: "ready", fields } : inv
          )
        );
        setEditValues(Object.fromEntries(fields.map((f) => [f.key, f.value])));
      })
      .catch(() => {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === id ? { ...inv, status: "error" } : inv
          )
        );
      });
  }, []);

  const [syncActive, setSyncActive] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [bannerCount, setBannerCount] = useState(0);
  const [newInvoiceIds, setNewInvoiceIds] = useState<Set<string>>(new Set());

  const pollGmailEmails = useCallback(() => {
    fetch("/api/gmail/emails")
      .then((res) => {
        setLastSyncedAt(new Date());
        if (!res.ok) return null;
        return res.json();
      })
      .then((data: { emails: GmailEmail[] } | null) => {
        if (!data?.emails) return;

        const newInvoices: Invoice[] = [];
        for (const email of data.emails) {
          if (seenEmailIds.current.has(email.id)) continue;
          seenEmailIds.current.add(email.id);

          const invoice = gmailEmailToInvoice(email);
          if (invoice) newInvoices.push(invoice);
        }

        if (newInvoices.length > 0) {
          setInvoices((prev) => [...newInvoices, ...prev]);
          setBannerCount(newInvoices.length);
          setNewInvoiceIds((prev) => {
            const next = new Set(prev);
            newInvoices.forEach((inv) => next.add(inv.id));
            return next;
          });
        }
      })
      .catch(() => {
        // Polling failures are silent — we'll retry on the next interval.
      });
  }, []);

  const handleToggleSync = useCallback(() => {
    if (!gmailConnected) return;
    if (syncActive) {
      setSyncActive(false);
    } else {
      setSyncActive(true);
      pollGmailEmails();
    }
  }, [gmailConnected, syncActive, pollGmailEmails]);

  useEffect(() => {
    if (!syncActive) return;
    const id = setInterval(pollGmailEmails, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [syncActive, pollGmailEmails]);

  useEffect(() => {
    if (bannerCount === 0) return;
    function dismiss() {
      setBannerCount(0);
    }
    document.addEventListener("mousedown", dismiss);
    return () => document.removeEventListener("mousedown", dismiss);
  }, [bannerCount]);

  const handleClearNewId = useCallback((id: string) => {
    setNewInvoiceIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedId) return;
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === selectedId
          ? {
              ...inv,
              fields: inv.fields.map((f) => ({
                ...f,
                value: editValues[f.key] ?? f.value,
              })),
            }
          : inv
      )
    );
  }, [selectedId, editValues]);

  const handleDiscard = useCallback(() => {
    if (!selectedInvoice) return;
    setEditValues(
      Object.fromEntries(selectedInvoice.fields.map((f) => [f.key, f.value]))
    );
  }, [selectedInvoice]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden">
      {bannerCount > 0 && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 shadow-md shadow-sky-100">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 shrink-0 text-sky-500"
              aria-hidden
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span className="text-sm font-medium text-sky-700">
              {bannerCount === 1
                ? "1 new invoice picked up from mail"
                : `${bannerCount} new invoices picked up from mail`}
            </span>
          </div>
        </div>
      )}
      <InvoiceList
        invoices={invoices}
        selectedId={selectedId}
        collapsed={leftCollapsed}
        gmailConnected={gmailConnected}
        syncActive={syncActive}
        lastSyncedAt={lastSyncedAt}
        newInvoiceIds={newInvoiceIds}
        onSelect={handleSelect}
        onUpload={handleUpload}
        onToggleSync={handleToggleSync}
        onClearNewId={handleClearNewId}
        onToggleCollapse={() => setLeftCollapsed((prev) => !prev)}
      />

      <InvoicePreview invoice={selectedInvoice} onUpload={handleUpload} />

      {showEditPanel && (
        <InvoiceEditPanel
          invoice={selectedInvoice}
          editValues={editValues}
          collapsed={rightCollapsed}
          onFieldChange={handleFieldChange}
          onSave={handleSave}
          onDiscard={handleDiscard}
          onToggleCollapse={() => setRightCollapsed((prev) => !prev)}
        />
      )}
    </div>
  );
}
