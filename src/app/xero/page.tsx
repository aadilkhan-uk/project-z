import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { AppSidebar } from "@/features/invoices/components/AppSidebar";

export const metadata: Metadata = {
  title: "Xero · Project Z",
};

export default async function XeroPage() {
  const cookieStore = await cookies();
  const xeroConnected = cookieStore.has("xero_access_token");

  return (
    <div className="flex h-screen bg-zinc-50/60">
      <AppSidebar activePath="/xero" />
      <main className="flex min-w-0 flex-1 items-center justify-center overflow-hidden">
        {xeroConnected ? <XeroConnected /> : <XeroConnect />}
      </main>
    </div>
  );
}

function XeroConnect() {
  return (
    <div className="flex flex-col items-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#13B5EA]/10">
        <XeroLogo />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-zinc-900">Connect to Xero</h1>
        <p className="max-w-xs text-sm text-zinc-500">
          Link your Xero account to sync invoices, contacts, and accounting
          data directly in Project&nbsp;Z.
        </p>
      </div>
      <Link
        href="/api/auth/xero"
        className="inline-flex items-center gap-2 rounded-xl bg-[#13B5EA] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#13B5EA]/30 transition hover:bg-[#0fa3d4] active:scale-95"
      >
        <XeroLogo small />
        Connect to Xero
      </Link>
      <p className="text-xs text-zinc-400">
        You&apos;ll be redirected to Xero to authorise access.
      </p>
    </div>
  );
}

function XeroConnected() {
  return (
    <div className="flex flex-col items-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 text-emerald-500"
          aria-hidden
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-zinc-900">Xero Connected</h1>
        <p className="max-w-xs text-sm text-zinc-500">
          Your Xero account is linked. You can now publish invoices directly
          from the Invoices tab.
        </p>
      </div>
      <form action="/api/auth/xero/disconnect" method="POST">
        <button
          type="submit"
          className="text-xs text-zinc-400 underline underline-offset-2 transition hover:text-zinc-600"
        >
          Disconnect Xero
        </button>
      </form>
    </div>
  );
}

function XeroLogo({ small }: { small?: boolean }) {
  const size = small ? "h-4 w-4" : "h-8 w-8";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`${size} text-[#13B5EA]`}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
      <path
        fill="currentColor"
        d="M8.05 8.05a.9.9 0 0 1 1.27 0L12 10.73l2.68-2.68a.9.9 0 1 1 1.27 1.27L13.27 12l2.68 2.68a.9.9 0 0 1-1.27 1.27L12 13.27l-2.68 2.68a.9.9 0 0 1-1.27-1.27L10.73 12 8.05 9.32a.9.9 0 0 1 0-1.27Z"
      />
    </svg>
  );
}
