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
}
