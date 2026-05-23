import type { HTMLAttributes } from "react";

import { cn } from "./cn";

/**
 * Surface primitive used by the transactions feature.
 * Soft border, subtle shadow, no rounded ornamentation — financial UIs read
 * better when surfaces stay quiet.
 */
export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(15,15,30,0.04)]",
        className
      )}
      {...props}
    />
  );
}
