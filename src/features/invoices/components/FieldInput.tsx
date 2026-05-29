"use client";

import { cn } from "@/components/ui/cn";
import type { InvoiceField } from "../types/invoice";

export function FieldInput({
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
