import { redirect } from "next/navigation";

import {
  getTransactions,
  UnauthenticatedError,
} from "@/features/transactions/api/getTransactions";
import { Sidebar } from "@/features/transactions/components/Sidebar";
import { TransactionsWorkspace } from "@/features/transactions/components/TransactionsWorkspace";

export const metadata = {
  title: "Transactions · Project Z",
};

export default async function TransactionsPage() {
  let transactions;
  try {
    transactions = await getTransactions();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect("/connect?next=/transactions");
    }
    throw error;
  }

  return (
    <div className="flex h-screen bg-zinc-50/60">
      <Sidebar />
      <main className="flex min-w-0 flex-1">
        <TransactionsWorkspace transactions={transactions} />
      </main>
    </div>
  );
}
