/**
 * Date formatting helpers for the transactions UI.
 *
 * Centralising these formatters keeps presentation consistent across the list,
 * the details panel, and any future export views without introducing a date
 * library.
 */

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const FULL_DATE = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "May 20, 14:22" style — used in the list row. */
export function formatShortDate(date: Date): string {
  return SHORT_DATE.format(date);
}

/** "Monday, 20 May 2024, 14:22" style — used in the details panel. */
export function formatFullDate(date: Date): string {
  return FULL_DATE.format(date);
}
