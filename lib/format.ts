/** Formatting helpers for money, dates, and percentages. Currency: PKR.
 *  We prefix a literal "PKR " (instead of the "Rs" symbol Intl emits). */

const pkrNumber = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 0,
});

const pkrCompact = new Intl.NumberFormat("en-PK", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number): string {
  return `PKR ${pkrNumber.format(Number.isFinite(value) ? value : 0)}`;
}

export function formatCompactCurrency(value: number): string {
  return `PKR ${pkrCompact.format(Number.isFinite(value) ? value : 0)}`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(fractionDigits)}%`;
}

/**
 * Day-first, matching the en-PK currency locale used everywhere else — mixing
 * "Jul 28, 2026" with "PKR 1,50,000" reads as two different apps, and
 * month-first is genuinely ambiguous to a day-first audience.
 */
export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? parseDateOnly(input) : input;
  if (!d || Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * `new Date("2026-07-28")` is parsed as UTC midnight, which renders as the
 * PREVIOUS day for anyone behind UTC. Postgres `date` columns have no time or
 * zone, so build them in local time and keep the day the user actually typed.
 */
export function parseDateOnly(input: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) return new Date(input);
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
}

/** "today", "yesterday", "3 days ago", then falls back to an absolute date. */
export function formatRelativeDate(input: string | Date): string {
  const d = typeof input === "string" ? parseDateOnly(input) : input;
  if (!d || Number.isNaN(d.getTime())) return "—";

  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round(
    (startOfDay(new Date()) - startOfDay(d)) / 86_400_000,
  );

  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days === -1) return "tomorrow";
  if (days > 1 && days < 30) return `${days} days ago`;
  if (days < -1 && days > -30) return `in ${Math.abs(days)} days`;
  return formatDate(d);
}

/** Today as YYYY-MM-DD in LOCAL time, for `<input type="date">` values. */
export function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Digit grouping for amount inputs, in the same locale as the display
 * currency. "150000" typed into a bare number field is easy to misread as
 * 15,000 — a factor-of-ten error on a money field.
 */
export function formatAmountInput(
  value: string | number,
  allowNegative = false,
): string {
  const str = String(value);
  const negative = allowNegative && str.trim().startsWith("-");
  const digits = str.replace(/[^\d]/g, "");
  if (!digits) return negative ? "-" : "";
  return `${negative ? "-" : ""}${pkrNumber.format(Number(digits))}`;
}

/** Inverse of formatAmountInput — grouped text back to a plain number string. */
export function parseAmountInput(value: string, allowNegative = false): string {
  const negative = allowNegative && value.trim().startsWith("-");
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `${negative ? "-" : ""}${digits}`;
}

/** Net margin as a percentage of revenue; safe against divide-by-zero. */
export function netMargin(revenue: number, expenses: number): number {
  if (revenue <= 0) return 0;
  return ((revenue - expenses) / revenue) * 100;
}
