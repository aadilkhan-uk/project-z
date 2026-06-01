import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { AppSidebar } from "@/features/invoices/components/AppSidebar";

export const metadata: Metadata = {
  title: "Mailbox · Project Z",
};

export default async function MailboxPage() {
  const cookieStore = await cookies();
  const gmailConnected = cookieStore.has("gmail_access_token");

  return (
    <div className="flex h-screen bg-zinc-50/60">
      <AppSidebar activePath="/mailbox" />
      <main className="flex min-w-0 flex-1 items-center justify-center overflow-hidden">
        {gmailConnected ? <MailboxConnected /> : <MailboxConnect />}
      </main>
    </div>
  );
}

function MailboxConnect() {
  return (
    <div className="flex flex-col items-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
        <MailIcon className="h-8 w-8 text-zinc-500" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-zinc-900">Connect a Mailbox</h1>
        <p className="max-w-xs text-sm text-zinc-500">
          Connect your email account so Project&nbsp;Z can automatically detect
          incoming invoices and bills.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Link
          href="/api/auth/gmail"
          className="inline-flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-95"
        >
          <GoogleIcon />
          Connect to Gmail
        </Link>

        <p className="text-xs text-zinc-400">
          More providers coming soon.
        </p>
      </div>

      <p className="text-xs text-zinc-400">
        You&apos;ll be redirected to Google to authorise read-only access.
      </p>
    </div>
  );
}

function MailboxConnected() {
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
        <h1 className="text-xl font-semibold text-zinc-900">Gmail Connected</h1>
        <p className="max-w-xs text-sm text-zinc-500">
          Your Gmail account is linked. Project&nbsp;Z can now scan your inbox
          for incoming invoices.
        </p>
      </div>
      <form action="/api/auth/gmail/disconnect" method="POST">
        <button
          type="submit"
          className="text-xs text-zinc-400 underline underline-offset-2 transition hover:text-zinc-600"
        >
          Disconnect Gmail
        </button>
      </form>
    </div>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7 10-7" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
