"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/components/ui/cn";
import { CreateContactForm } from "./CreateContactForm";

interface XeroContact {
  ContactID: string;
  Name: string;
}

type ContactFetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; contacts: XeroContact[] }
  | { status: "error"; message: string };

export function ContactAutocomplete({
  contactId,
  contactName,
  onSelect,
  onCreated,
  required,
}: {
  contactId: string;
  contactName: string;
  onSelect: (id: string, name: string) => void;
  onCreated: (id: string, name: string) => void;
  required?: boolean;
}) {
  const [inputValue, setInputValue] = useState(contactName);
  const [fetchState, setFetchState] = useState<ContactFetchState>({ status: "idle" });
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    setInputValue(contactName);
  }, [contactName]);

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
      <div className="mb-1.5 flex items-center justify-between">
        <label
          htmlFor="xero-contact-name"
          className="text-xs font-medium uppercase tracking-wide text-zinc-400"
        >
          Contact{required && <span className="ml-0.5 text-red-400">*</span>}
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

      {showCreate && (
        <CreateContactForm
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
