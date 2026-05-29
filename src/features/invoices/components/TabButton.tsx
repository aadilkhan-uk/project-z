"use client";

import type React from "react";

import { cn } from "@/components/ui/cn";

export function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative -mb-px shrink-0 px-1 pb-3 pt-3 text-xs font-medium transition",
        "mr-5 last:mr-0",
        active
          ? "border-b-2 border-violet-500 text-violet-600"
          : "border-b-2 border-transparent text-zinc-400 hover:text-zinc-600"
      )}
    >
      {children}
    </button>
  );
}
