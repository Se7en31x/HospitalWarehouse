/**
 * dateUtils.ts
 * Single source of truth for all date/time formatting in this application.
 *
 * Locale   : th-TH  (Thai)
 * TimeZone : Asia/Bangkok
 * Calendar : Buddhist Era (th-TH locale applies BE automatically)
 *
 * All functions accept string | Date | null | undefined and return "-" for
 * any missing or invalid value, so call-sites never need null guards.
 */

const LOCALE = "th-TH";
const TZ = "Asia/Bangkok";

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * fmtDate — standard date, no time.
 * Output: "30 เม.ย. 2569"
 * Use for: expiry dates, receive dates, due dates, return completion dates.
 */
export function fmtDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "-";
  return d.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  });
}

/**
 * fmtDateTime — date + time separated by " · " (U+00B7).
 * Output: "30 เม.ย. 2569 · 14:30"
 * Use for: stock movements, submitted_at, action timestamps where exact time matters.
 */
export function fmtDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "-";
  const datePart = d.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  });
  const timePart = d.toLocaleTimeString(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
  return `${datePart} · ${timePart}`;
}

/**
 * fmtDateCompact — day + short month, no year.
 * Output: "30 เม.ย."
 * Use for: notification bell mini-badges, tight-space labels.
 */
export function fmtDateCompact(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "-";
  return d.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    timeZone: TZ,
  });
}

/**
 * fmtDateLong — full (long) month name for official documents.
 * Output: "30 เมษายน 2569"
 * Use for: PDF/print report headers, dashboard title date, profile page.
 */
export function fmtDateLong(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "-";
  return d.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });
}
