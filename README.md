# DentalOS — Dental Practice Platform for Mauritius

A multi-tenant SaaS for dental clinics in Mauritius: a **practice app** for dentists/staff
and a **patient portal** for clients. Each clinic gets its own **isolated database**
(database-per-tenant), provisioned automatically. Built for the Mauritius market — MUR
currency, EN/FR, +230 phone/OTP, DD/MM/YYYY, `Indian/Mauritius` timezone, and local payment
rails (mocked in dev, pluggable for Peach/MCB Juice/MauCAS later).

## Status — Passes 1–4 complete ✅ (verified end-to-end)

**Foundation & scheduling (Pass 1)**
- **Multi-tenant onboarding** — one click provisions an isolated Postgres database per clinic,
  migrates it, and seeds defaults (operatories, providers, appointment types, diagnoses, Rx favourites).
- **Practice app** — staff login (per-tenant scrypt+JWT auth, RBAC), a **schedule cockpit**
  (operatory-column day grid, status pipeline, live "now" line, new-appointment drawer, action panel),
  and patient records (list/search, create, detail).
- **Patient portal** — phone **+ OTP** sign-in, mobile-first **booking wizard**, dashboard.
- **Notifications worker** — confirmations + layered reminders (7d/48h/24h), EN/FR, mock SMS/email/in-app.

**Clinical (Pass 2)**
- Tabbed patient chart: interactive **SVG odontogram** (FDI, per-tooth conditions + surface-aware
  procedures), **treatment plans** (auto-total, propose/accept), **SOAP notes** (sign), **prescriptions**
  with printable Rx, curated diagnoses.
- Portal **digital intake** (medical history + DPA-2017 consents + e-signature) and **records** view
  (shared treatment plans with accept/e-sign, prescriptions). `treatment_plan_shared` notification.

**Billing & payments (Pass 3)**
- Per-patient **ledger** with auto-recomputed balance, **invoices** (sequential numbering, line items,
  printable), **estimates** with Mauritius pay-now/claim-back split, **payments** (cash + online via the
  payment provider; MCB Juice / MauCAS QR / card / my.t money), **payment receipts**, and **end-of-day
  reconciliation** by method.
- Portal **pay-now** flow + invoice history.
- Full reminder cadence with **quiet-hours** deferral, **6-month recall** worker job (fires once),
  and `appointment_rescheduled` / `payment_due` notifications.

**Reporting & depth (Pass 4)**
- **Reports** dashboard (production, collections, outstanding, no-show rate, new patients, recall due;
  date range; production-vs-collections chart) + **CSV export**.
- **Periodontal charting** (6-site pocket-depth/recession grid, live CAL + deep-site summary).
- **Waitlist / ASAP** surfacing in the cockpit with one-click SMS outreach.

## Architecture

```
apps/
  practice/   Next.js 15 — staff app          ({clinic}.app.<domain> ; dev {clinic}.localhost:3000)
  portal/     Next.js 15 — patient portal      ({clinic}.book.<domain>; dev {clinic}.localhost:3100)
  worker/     Background reminder dispatcher
packages/
  core/           domain types, Zod schemas, MUR/locale, FDI teeth, catalogs
  db/             Drizzle schemas (control-plane + per-tenant) + generated migrations
  tenancy/        control-plane registry, provisioning drivers, migrator, TenantResolver, onboarding
  providers/      sms/email/payment/storage adapter interfaces + mock impls
  auth/           per-tenant staff auth (scrypt + JWT), RBAC, patient OTP
  notifications/  EN/FR templates, scheduling, dispatch, compliance gate
  api/            domain services: scheduling, patients, availability, booking, dashboard
  ui/             shadcn-style components, design tokens, EN/FR i18n
  config/         shared tsconfig + tailwind presets
```

**Tenancy:** a shared **control-plane DB** (`dentalos_control`) holds the tenant registry with
encrypted per-tenant connection strings; each clinic's data lives in its own database
(`dentalos_tenant_<slug>`). The `TenantResolver` maps a request's subdomain → clinic DB with an
LRU connection cache. In production this targets **Neon project-per-tenant** via the same
`ProvisioningDriver` interface (`PROVISIONING_DRIVER=neon`).

## Running locally

Requirements: Node ≥ 20 and a local PostgreSQL on `:5432` (the connection in `.env` uses trust auth).

```bash
npm install
cp .env.example .env          # adjust USERNAME / Postgres connection if needed
npm run db:provision-demo     # creates control plane + a seeded "demo" clinic

# In separate terminals (or use `npm run dev` to run all via Turbo):
npm run dev -w @dentalos/practice   # http://demo.localhost:3000
npm run dev -w @dentalos/portal     # http://demo.localhost:3100
npm run dev -w @dentalos/worker     # dispatches reminders; prints mock SMS/email

# Demo logins
#   Staff:   http://demo.localhost:3000   owner@demo.mu / password123
#   Patient: http://demo.localhost:3100   any +230 number; OTP is printed in the worker/app console
```

> Use a Chromium/Firefox-based browser — `*.localhost` subdomains resolve to 127.0.0.1 automatically.

### Useful scripts

| Command | Purpose |
|---|---|
| `npm run db:provision-control` | Create + migrate the control-plane DB |
| `npm run db:provision-demo` | Provision a seeded demo clinic |
| `npm run db:migrate:fleet [-- --dry-run]` | Apply tenant migrations across all clinics |
| `npm run db:generate -w @dentalos/db` | Regenerate Drizzle SQL after schema changes |
| `npm run db:reset` | **Dev only** — drop all tenant DBs + the control DB |
| `npm run typecheck` | Typecheck all workspaces |

## Notes & deviations from the original plan

- **npm workspaces** (not pnpm) and **local Postgres** (not Docker) — chosen for the dev
  environment; architecture is unchanged.
- **Calendar** is a custom operatory-column grid rather than FullCalendar (whose resource/timeline
  views require a paid licence).
- **Auth** is a focused per-tenant implementation (scrypt + JWT) instead of Better Auth, isolated
  behind `@dentalos/auth` so it can be swapped later.
- Payments/SMS/email use **mock adapters** in dev; real Mauritius providers plug in behind the
  `@dentalos/providers` interfaces by setting `PROVIDER_*` env vars + keys.

See `~/.claude/plans/i-want-to-build-serialized-wadler.md` for the full plan and the v2/v3 roadmap
(clinical charting/odontogram, treatment plans, billing/payments, full recall, reporting, etc.).
