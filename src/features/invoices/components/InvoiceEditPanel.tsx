"use client";

import { cn } from "@/components/ui/cn";
import type { Invoice, InvoiceField } from "../types/invoice";

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
            <p className="text-sm font-semibold text-zinc-900">Edit Details</p>
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
            Edit Details
          </span>
        </div>
      )}

      {/* Form */}
      {!collapsed && (
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
    </aside>
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
