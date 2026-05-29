"use client";

import type React from "react";
import { useState } from "react";

import { cn } from "@/components/ui/cn";

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

export function CreateContactForm({
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
