import { Sidebar } from "@/features/transactions/components/Sidebar";

/**
 * Streaming fallback for `/transactions` — matches the live layout so the
 * sidebar stays mounted and the list area shows a quiet skeleton while data
 * loads.
 */
export default function Loading() {
  return (
    <div className="flex h-screen bg-zinc-50/60">
      <Sidebar />
      <main className="flex min-w-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-baseline justify-between border-b border-zinc-200/80 bg-white px-6 py-5">
            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-zinc-200/80" />
              <div className="h-3 w-20 animate-pulse rounded bg-zinc-200/60" />
            </div>
          </header>
          <ul className="divide-y divide-zinc-100">
            {Array.from({ length: 10 }).map((_, idx) => (
              <li
                key={idx}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-zinc-200" />
                <span className="h-3 w-28 shrink-0 animate-pulse rounded bg-zinc-200/80" />
                <span className="h-3 flex-1 animate-pulse rounded bg-zinc-200/60" />
                <span className="h-3 w-16 shrink-0 animate-pulse rounded bg-zinc-200/80" />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
