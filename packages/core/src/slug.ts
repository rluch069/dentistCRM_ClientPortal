/** Subdomain-safe slug: lowercase, alphanumeric + hyphens, no leading/trailing hyphen. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const RESERVED_SLUGS = new Set([
  "www", "app", "book", "api", "admin", "control", "dashboard", "static",
  "assets", "auth", "login", "signup", "onboarding", "mail", "status", "support",
]);

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(slug) && !RESERVED_SLUGS.has(slug);
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/** A short, human-friendly random code (e.g. OTP, confirmation). Caller supplies RNG bytes for testability. */
export function randomNumericCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}
