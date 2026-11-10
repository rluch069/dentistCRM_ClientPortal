/** Seeded demo staff per clinic slug — mirrors scripts/provision-demo.ts; keep in sync when that changes. */
export const DEMO_PASSWORD = "password123";

export const DEMO_STAFF: Record<string, { label: string; email: string }[]> = {
  demo: [
    { label: "Owner / Dentist", email: "owner@demo.mu" },
    { label: "Reception", email: "front@demo.mu" },
  ],
  solo: [{ label: "Owner / Dentist", email: "owner@solo.mu" }],
};

/** Patient-portal dev port (apps/portal `next dev --port 3100`). */
export const PORTAL_PORT = 3100;
