import type { Metadata } from "next";
import { cookies } from "next/headers";

import { getGmailAccessToken } from "@/lib/gmail";
import { AppSidebar } from "@/features/invoices/components/AppSidebar";
import {
  InvoicesWorkspace,
  LAST_SYNCED_AT_COOKIE,
  SYNC_ENABLED_COOKIE,
} from "@/features/invoices/components/InvoicesWorkspace";

export const metadata: Metadata = {
  title: "Invoices · Project Z",
};

export default async function InvoicesPage() {
  const cookieStore = await cookies();
  // Verify we can actually obtain a usable access token (refreshing if needed)
  // rather than just checking for the presence of a cookie. An expired or
  // revoked token resolves to null, so the toggle is hidden and the user is
  // prompted to reconnect instead.
  const gmailConnected = (await getGmailAccessToken(cookieStore)) !== null;

  const initialSyncEnabled =
    cookieStore.get(SYNC_ENABLED_COOKIE)?.value === "true";

  const lastSyncedRaw = cookieStore.get(LAST_SYNCED_AT_COOKIE)?.value;
  const parsedLastSynced = lastSyncedRaw ? Number(lastSyncedRaw) : NaN;
  const initialLastSyncedAt =
    Number.isFinite(parsedLastSynced) && parsedLastSynced > 0
      ? parsedLastSynced
      : null;

  return (
    <div className="flex h-screen bg-zinc-50/60">
      <AppSidebar activePath="/invoices" />
      <main className="flex min-w-0 flex-1 overflow-hidden">
        <InvoicesWorkspace
          gmailConnected={gmailConnected}
          initialSyncEnabled={initialSyncEnabled}
          initialLastSyncedAt={initialLastSyncedAt}
        />
      </main>
    </div>
  );
}
