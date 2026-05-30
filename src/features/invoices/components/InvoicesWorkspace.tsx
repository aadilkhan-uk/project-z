"use client";

import { useCallback, useState } from "react";

import { MOCK_INVOICES } from "../lib/mockInvoices";
import type { Invoice } from "../types/invoice";
import { InvoiceEditPanel } from "./InvoiceEditPanel";
import { InvoiceList } from "./InvoiceList";
import { InvoicePreview } from "./InvoicePreview";

const INITIAL_INVOICES: Invoice[] =
  process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === "true" ? MOCK_INVOICES : [];

/**
 * Client boundary for the invoices explorer.
 *
 * Owns all interactive state: the list of invoices, which one is selected,
 * collapse states for both side panels, and the in-progress edit values for
 * the right-hand form. Everything above this in the tree stays a server component.
 */
export function InvoicesWorkspace() {
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

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
        const vendor = data.vendor?.name ?? data.vendor ?? "Unknown Vendor";
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
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <InvoiceList
        invoices={invoices}
        selectedId={selectedId}
        collapsed={leftCollapsed}
        onSelect={handleSelect}
        onUpload={handleUpload}
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
