/** Mauritius locale defaults. */
export const DEFAULT_TIMEZONE = "Indian/Mauritius"; // UTC+4, no DST
export const DEFAULT_CURRENCY = "MUR";
export const CURRENCY_SYMBOL = "Rs";
export const COUNTRY_CODE = "MU";
export const PHONE_COUNTRY_CALLING_CODE = "+230";

/** Money is stored as integer cents (MUR has 2 minor units). */
export function formatMoney(cents: number, locale: "en" | "fr" = "en"): string {
  const amount = cents / 100;
  const formatted = new Intl.NumberFormat(locale === "fr" ? "fr-MU" : "en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${CURRENCY_SYMBOL} ${formatted}`;
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Normalise a Mauritian phone number to E.164 (+230XXXXXXXX).
 * Accepts local 8-digit numbers, numbers with leading 0, or already-prefixed.
 */
export function normalizeMuPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+230")) {
    const rest = digits.slice(4);
    return rest.length === 7 || rest.length === 8 ? `+230${rest}` : null;
  }
  if (digits.startsWith("230")) {
    const rest = digits.slice(3);
    return rest.length === 7 || rest.length === 8 ? `+230${rest}` : null;
  }
  const local = digits.replace(/^0+/, "");
  if (local.length === 7 || local.length === 8) return `+230${local}`;
  return null;
}
