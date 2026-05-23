import Link from "next/link";

import { cn } from "@/components/ui/cn";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
}

/**
 * Static left sidebar — pure server component.
 *
 * Renders the product mark and a single nav entry for now; designed to grow
 * without becoming a client component (no interactive state lives here).
 */
export function Sidebar() {
  const items: NavItem[] = [
    {
      label: "Transactions",
      href: "/transactions",
      icon: <TransactionsIcon />,
      active: true,
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
