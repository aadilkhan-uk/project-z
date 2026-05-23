/**
 * Locale-aware currency formatter.
 *
 * Uses the platform `Intl.NumberFormat` to avoid bringing in a heavy
 * formatting dependency. Pass `signDisplay: "always"` to render an explicit
 * `+` for credits.
 */
export function formatCurrency(
  amount: number,
  currency: string,
  options: { signDisplay?: "auto" | "always" | "never" } = {}
): string {
  const { signDisplay = "auto" } = options;

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      signDisplay,
    }).format(amount);
  } catch {
    // Fall back gracefully if the currency code is unknown to the runtime.
    const prefix = signDisplay === "always" && amount > 0 ? "+" : "";
    return `${prefix}${amount.toFixed(2)} ${currency}`;
  }
}
