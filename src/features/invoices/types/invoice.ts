export interface ExtractedInvoiceVendor {
  name: string;
  address: string;
  email: string;
  phone: string;
  tax_id: string;
}

export interface ExtractedInvoiceBillTo {
  name: string;
  address: string;
  email: string;
}

export interface ExtractedInvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface ExtractedInvoice {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  vendor: ExtractedInvoiceVendor;
  bill_to: ExtractedInvoiceBillTo;
  line_items: ExtractedInvoiceLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total_amount: number;
  currency: string;
  payment_terms: string;
  notes: string;
}

export type InvoiceStatus = "processing" | "ready" | "error";

export type InvoiceFieldType = "text" | "number" | "date" | "currency";

export interface InvoiceField {
  key: string;
  label: string;
  value: string;
  type: InvoiceFieldType;
}

export interface Invoice {
  id: string;
  name: string;
  vendor: string;
  uploadedAt: Date;
  status: InvoiceStatus;
  fields: InvoiceField[];
  fileUrl?: string;
  fileMimeType?: string;
  /** "upload" for manually uploaded files, "email" for mailbox-sourced invoices. */
  source?: "upload" | "email";
  /** Plain-text email body, set when source is "email" and extraction came from the body. */
  emailBody?: string;
  /** Attachment filename, set when source is "email" and extraction came from an attachment. */
  emailAttachmentName?: string;
}
