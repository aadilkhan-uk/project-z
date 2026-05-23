import type { ButtonHTMLAttributes } from "react";

import { cn } from "./cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

/**
 * Accessible icon-only button. Always require a `label` so the button has an
 * accessible name even when only a glyph is rendered.
 */
export function IconButton({
  label,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500",
        "transition hover:bg-zinc-100 hover:text-zinc-900",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
