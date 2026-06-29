import { pgTable, uuid, text, integer, timestamp, jsonb, boolean, pgEnum, bigint } from "drizzle-orm/pg-core";
import { TENANT_STATUSES, SUBSCRIPTION_PLANS, LOCALES } from "@dentalos/core/constants";

export const tenantStatusEnum = pgEnum("tenant_status", TENANT_STATUSES);
export const subscriptionPlanEnum = pgEnum("subscription_plan", SUBSCRIPTION_PLANS);
export const controlLocaleEnum = pgEnum("control_locale", LOCALES);

/** One row per clinic. The single source of truth for routing & lifecycle. */
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  status: tenantStatusEnum("status").notNull().default("provisioning"),
  region: text("region").notNull().default("mu"),
  locale: controlLocaleEnum("locale").notNull().default("en"),
  timezone: text("timezone").notNull().default("Indian/Mauritius"),
  /** Physical database name (LocalPostgres) or Neon project id (prod). */
  dbName: text("db_name").notNull(),
  schemaVersion: integer("schema_version").notNull().default(0),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  dpoRegisteredAt: timestamp("dpo_registered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Encrypted connection string for each tenant DB (AES-256-GCM, see @dentalos/tenancy). */
export const tenantDbCredentials = pgTable("tenant_db_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  driver: text("driver").notNull().default("local"), // local | neon
  encryptedConnString: text("encrypted_conn_string").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** SaaS subscription state for billing the clinic itself. */
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  plan: subscriptionPlanEnum("plan").notNull().default("trial"),
  status: text("status").notNull().default("trialing"), // trialing | active | past_due | cancelled
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  priceCentsMonthly: bigint("price_cents_monthly", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Control-plane audit of provisioning / lifecycle events (no PHI). */
export const provisioningEvents = pgTable("provisioning_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  event: text("event").notNull(),
  ok: boolean("ok").notNull().default(true),
  detail: jsonb("detail").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type TenantDbCredential = typeof tenantDbCredentials.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
