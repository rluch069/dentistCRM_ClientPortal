import { eq, inArray } from "drizzle-orm";
import { createControlClient, type ControlConnection, type ControlDb } from "@dentalos/db";
import { tenants, tenantDbCredentials, subscriptions, provisioningEvents, type Tenant } from "@dentalos/db/control";
import { getTenancyEnv } from "./env";
import { encryptSecret, decryptSecret } from "./crypto";

/** Open a connection to the control-plane DB from env. Caller must close it. */
export function openControlConnection(): ControlConnection {
  return createControlClient(getTenancyEnv().controlPlaneUrl);
}

export interface RegisterTenantInput {
  slug: string;
  name: string;
  locale: "en" | "fr";
  timezone: string;
  region?: string;
  dbName: string;
  driver: "local" | "neon";
  connString: string;
}

/** Insert the tenant + encrypted credential + a trial subscription (status=provisioning). */
export async function registerTenant(db: ControlDb, input: RegisterTenantInput): Promise<Tenant> {
  const env = getTenancyEnv();
  const [tenant] = await db
    .insert(tenants)
    .values({
      slug: input.slug,
      name: input.name,
      locale: input.locale,
      timezone: input.timezone,
      region: input.region ?? "mu",
      dbName: input.dbName,
      status: "provisioning",
    })
    .returning();

  await db.insert(tenantDbCredentials).values({
    tenantId: tenant!.id,
    driver: input.driver,
    encryptedConnString: encryptSecret(input.connString, env.credentialEncryptionKey),
  });

  await db.insert(subscriptions).values({ tenantId: tenant!.id, plan: "trial", status: "trialing" });

  return tenant!;
}

export async function getTenantBySlug(db: ControlDb, slug: string): Promise<Tenant | undefined> {
  const rows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return rows[0];
}

export async function getTenantById(db: ControlDb, id: string): Promise<Tenant | undefined> {
  const rows = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return rows[0];
}

/** Decrypt and return the connection string for a tenant. */
export async function getTenantConnString(db: ControlDb, tenantId: string): Promise<string | undefined> {
  const env = getTenancyEnv();
  const rows = await db
    .select()
    .from(tenantDbCredentials)
    .where(eq(tenantDbCredentials.tenantId, tenantId))
    .limit(1);
  if (!rows[0]) return undefined;
  return decryptSecret(rows[0].encryptedConnString, env.credentialEncryptionKey);
}

export async function listTenants(db: ControlDb, statuses?: string[]): Promise<Tenant[]> {
  if (statuses && statuses.length > 0) {
    return db.select().from(tenants).where(inArray(tenants.status, statuses as Tenant["status"][]));
  }
  return db.select().from(tenants);
}

export async function setTenantStatus(db: ControlDb, tenantId: string, status: Tenant["status"]): Promise<void> {
  await db.update(tenants).set({ status, updatedAt: new Date() }).where(eq(tenants.id, tenantId));
}

export async function markTenantActive(db: ControlDb, tenantId: string, schemaVersion: number): Promise<void> {
  await db
    .update(tenants)
    .set({ status: "active", schemaVersion, onboardingCompletedAt: new Date(), updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));
}

export async function setTenantSchemaVersion(db: ControlDb, tenantId: string, schemaVersion: number): Promise<void> {
  await db.update(tenants).set({ schemaVersion, updatedAt: new Date() }).where(eq(tenants.id, tenantId));
}

export async function logProvisioningEvent(
  db: ControlDb,
  tenantId: string | null,
  event: string,
  ok: boolean,
  detail?: Record<string, unknown>,
): Promise<void> {
  await db.insert(provisioningEvents).values({ tenantId, event, ok, detail });
}
