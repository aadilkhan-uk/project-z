import Link from "next/link";

import { cn } from "@/components/ui/cn";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
}

/**
 * Global app sidebar — pure server component.
 *
 * Renders nav entries for each top-level section. The active item is
 * determined by the consuming page so this stays stateless and server-safe.
 */
export function AppSidebar({ activePath }: { activePath: string }) {
  const items: NavItem[] = [
    {
      label: "Transactions",
      href: "/transactions",
      icon: <TransactionsIcon />,
      active: activePath === "/transactions",
    },
    {
      label: "Invoices",
      href: "/invoices",
      icon: <InvoicesIcon />,
      active: activePath === "/invoices",
    },
  ];

  return (
    <aside className="hidden w-20 shrink-0 flex-col items-center border-r border-zinc-200/80 bg-white py-5 md:flex">
      <Link
        href="/transactions"
        aria-label="Project Z home"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500 text-white shadow-md shadow-violet-200 transition hover:bg-violet-600"
      >
        <span className="text-lg font-bold">Z</span>
      </Link>

      <nav className="mt-8 flex w-full flex-col items-center gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "group flex w-14 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition",
              item.active
                ? "bg-violet-50 text-violet-600"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition",
                item.active ? "text-violet-600" : "text-zinc-500"
              )}
            >
              {item.icon}
            </span>
            <span className="leading-none">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function TransactionsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M4 7h13" />
      <path d="m14 4 3 3-3 3" />
      <path d="M20 17H7" />
      <path d="m10 14-3 3 3 3" />
    </svg>
  );
}

function InvoicesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}
