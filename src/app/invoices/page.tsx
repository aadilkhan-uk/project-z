import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AppSidebar } from "@/features/invoices/components/AppSidebar";
import { InvoicesWorkspace } from "@/features/invoices/components/InvoicesWorkspace";

export const metadata: Metadata = {
  title: "Invoices · Project Z",
};

export default async function InvoicesPage() {
  const cookieStore = await cookies();
  const gmailConnected =
    cookieStore.has("gmail_access_token") ||
    cookieStore.has("gmail_refresh_token");

  return (
    <div className="flex h-screen bg-zinc-50/60">
      <AppSidebar activePath="/invoices" />
      <main className="flex min-w-0 flex-1 overflow-hidden">
        <InvoicesWorkspace gmailConnected={gmailConnected} />
      </main>
    </div>
  );
}
