"use client";

import { useCallback, useState } from "react";

import { MOCK_INVOICES } from "../lib/mockInvoices";
import type { Invoice } from "../types/invoice";
import { InvoiceEditPanel } from "./InvoiceEditPanel";
import { InvoiceList } from "./InvoiceList";
import { InvoicePreview } from "./InvoicePreview";

/**
 * Client boundary for the invoices explorer.
 *
 * Owns all interactive state: the list of invoices, which one is selected,
 * collapse states for both side panels, and the in-progress edit values for
 * the right-hand form. Everything above this in the tree stays a server component.
 */
export function InvoicesWorkspace() {
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
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
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      name: file.name,
      vendor: "Pending…",
      uploadedAt: new Date(),
      status: "processing",
      fields: [],
    };
    setInvoices((prev) => [newInvoice, ...prev]);
    setSelectedId(newInvoice.id);
    setEditValues({});
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
