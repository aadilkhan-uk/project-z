import type { Metadata } from "next";

import { AppSidebar } from "@/features/invoices/components/AppSidebar";
import { InvoicesWorkspace } from "@/features/invoices/components/InvoicesWorkspace";

export const metadata: Metadata = {
  title: "Invoices · Project Z",
};

export default function InvoicesPage() {
  return (
    <div className="flex h-screen bg-zinc-50/60">
      <AppSidebar activePath="/invoices" />
      <main className="flex min-w-0 flex-1 overflow-hidden">
        <InvoicesWorkspace />
      </main>
    </div>
  );
}
