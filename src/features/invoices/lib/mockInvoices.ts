import type { Invoice } from "../types/invoice";

export const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv-001",
    name: "AWS-Invoice-May2026.pdf",
    vendor: "Amazon Web Services",
    uploadedAt: new Date("2026-05-20"),
    status: "ready",
    fields: [
      { key: "vendor", label: "Vendor", value: "Amazon Web Services", type: "text" },
      { key: "invoice_number", label: "Invoice Number", value: "INV-2026-00451", type: "text" },
      { key: "invoice_date", label: "Invoice Date", value: "2026-05-01", type: "date" },
      { key: "due_date", label: "Due Date", value: "2026-05-31", type: "date" },
      { key: "subtotal", label: "Subtotal", value: "3840.00", type: "currency" },
      { key: "tax", label: "Tax (20%)", value: "768.00", type: "currency" },
      { key: "total", label: "Total", value: "4608.00", type: "currency" },
      { key: "po_number", label: "PO Number", value: "PO-2026-1182", type: "text" },
    ],
  },
  {
    id: "inv-002",
    name: "Stripe-April-Invoice.pdf",
    vendor: "Stripe Inc.",
    uploadedAt: new Date("2026-05-15"),
    status: "ready",
    fields: [
      { key: "vendor", label: "Vendor", value: "Stripe Inc.", type: "text" },
      { key: "invoice_number", label: "Invoice Number", value: "STR-APR-2026", type: "text" },
      { key: "invoice_date", label: "Invoice Date", value: "2026-04-30", type: "date" },
      { key: "due_date", label: "Due Date", value: "2026-05-30", type: "date" },
      { key: "subtotal", label: "Subtotal", value: "1250.00", type: "currency" },
      { key: "tax", label: "Tax (20%)", value: "250.00", type: "currency" },
      { key: "total", label: "Total", value: "1500.00", type: "currency" },
      { key: "po_number", label: "PO Number", value: "—", type: "text" },
    ],
  },
  {
    id: "inv-003",
    name: "Office-Supplies-Q1.pdf",
    vendor: "Staples Ltd.",
    uploadedAt: new Date("2026-05-10"),
    status: "error",
    fields: [],
  },
  {
    id: "inv-004",
    name: "Vercel-May2026.pdf",
    vendor: "Vercel Inc.",
    uploadedAt: new Date("2026-05-22"),
    status: "processing",
    fields: [],
  },
];
