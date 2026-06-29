import { DEFAULT_TIMEZONE } from "./constants/locale";

/** Format a UTC instant in the clinic timezone (default Indian/Mauritius). */
export function formatInTz(
  date: Date,
  opts: Intl.DateTimeFormatOptions = {},
  timeZone: string = DEFAULT_TIMEZONE,
  locale: "en" | "fr" = "en",
): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-MU" : "en-GB", {
    timeZone,
    ...opts,
  }).format(date);
}

/** DD/MM/YYYY — the Mauritius date convention. */
export function formatDate(date: Date, timeZone?: string, locale: "en" | "fr" = "en"): string {
  return formatInTz(date, { day: "2-digit", month: "2-digit", year: "numeric" }, timeZone, locale);
}

/** HH:mm 24-hour clock. */
export function formatTime(date: Date, timeZone?: string, locale: "en" | "fr" = "en"): string {
  return formatInTz(date, { hour: "2-digit", minute: "2-digit", hour12: false }, timeZone, locale);
}

export function formatDateTime(date: Date, timeZone?: string, locale: "en" | "fr" = "en"): string {
  return `${formatDate(date, timeZone, locale)} ${formatTime(date, timeZone, locale)}`;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** True if two instants fall on the same calendar day in the given timezone. */
export function isSameDayInTz(a: Date, b: Date, timeZone: string = DEFAULT_TIMEZONE): boolean {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return fmt(a) === fmt(b);
}

/** Minutes since local midnight (clinic tz) for a given instant. */
export function minutesIntoDay(date: Date, timeZone: string = DEFAULT_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/** Two [start,end) intervals overlap. */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Offset (ms) of a timezone from UTC at a given instant. Positive = ahead of UTC. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instant.getTime();
}

/** Convert a clinic-local wall time (yyyy-mm-dd + minute-of-day) to a UTC instant. */
export function clinicLocalToUtc(dateYmd: string, minuteOfDay: number, timeZone: string = DEFAULT_TIMEZONE): Date {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const utcGuess = Date.UTC(y!, m! - 1, d!, 0, 0, 0) + minuteOfDay * 60_000;
  const offset = zoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

/** Day of week (0=Sun..6=Sat) for an instant in the given timezone. */
export function dayOfWeekInTz(date: Date, timeZone: string = DEFAULT_TIMEZONE): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

/** yyyy-mm-dd for an instant in the given timezone. */
export function ymdInTz(date: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Day-of-week for a yyyy-mm-dd string (0=Sun..6=Sat), independent of timezone. */
export function dayOfWeekForYmd(dateYmd: string): number {
  const [y, m, d] = dateYmd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

/** Add N days to a yyyy-mm-dd string, returning yyyy-mm-dd. */
export function addDaysYmd(dateYmd: string, days: number): string {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
