/**
 * Tiny class-name joiner — keeps component code readable without pulling in
 * `clsx`/`classnames` for an MVP.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
