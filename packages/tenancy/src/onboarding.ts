import { createTenantClient, type TenantDb } from "@dentalos/db";
import type { Tenant } from "@dentalos/db/control";
import { isValidSlug, type Locale } from "@dentalos/core";
import { getTenancyEnv } from "./env";
import { createProvisioningDriver } from "./provisioning/index";
import { migrateTenant, latestTenantSchemaVersion } from "./migrator";
import { seedTenant, type SeedTenantResult } from "./seed";
import {
  openControlConnection,
  registerTenant,
  getTenantBySlug,
  markTenantActive,
  logProvisioningEvent,
} from "./registry";

export interface OnboardClinicInput {
  slug: string;
  name: string;
  locale?: Locale;
  timezone?: string;
  phone?: string;
  email?: string;
  providerNames?: string[];
  operatoryNames?: string[];
}

export interface OnboardingHooks {
  /** Runs against the new tenant DB after seeding (e.g. create the owner staff user). */
  afterSeed?: (ctx: { tenantDb: TenantDb; connString: string; tenant: Tenant; seed: SeedTenantResult }) => Promise<void>;
}

export interface OnboardClinicResult {
  tenant: Tenant;
  connString: string;
  seed: SeedTenantResult;
}

/**
 * Full one-click onboarding: provision an isolated DB → migrate → seed defaults
 * → register (encrypted) in the control plane → run afterSeed hook → mark active.
 */
export async function onboardClinic(input: OnboardClinicInput, hooks: OnboardingHooks = {}): Promise<OnboardClinicResult> {
  if (!isValidSlug(input.slug)) {
    throw new Error(`Invalid or reserved slug: ${input.slug}`);
  }
  const env = getTenancyEnv();
  const driver = createProvisioningDriver(env);
  const control = openControlConnection();

  try {
    if (await getTenantBySlug(control.db, input.slug)) {
      throw new Error(`A clinic with the slug "${input.slug}" already exists`);
    }

    // 1. Create the isolated database for this clinic.
    const provisioned = await driver.createDatabase(input.slug);

    // 2. Apply tenant migrations to the fresh DB.
    await migrateTenant(provisioned.connString);

    // 3. Seed defaults + register + run hook + activate.
    const tenantConn = createTenantClient(provisioned.connString);
    try {
      const seed = await seedTenant(tenantConn.db, {
        practiceName: input.name,
        locale: input.locale,
        timezone: input.timezone,
        phone: input.phone,
        email: input.email,
        providerNames: input.providerNames,
        operatoryNames: input.operatoryNames,
      });

      const tenant = await registerTenant(control.db, {
        slug: input.slug,
        name: input.name,
        locale: input.locale ?? "en",
        timezone: input.timezone ?? "Indian/Mauritius",
        dbName: provisioned.dbName,
        driver: provisioned.driver,
        connString: provisioned.connString,
      });

      await logProvisioningEvent(control.db, tenant.id, "database_provisioned", true, { dbName: provisioned.dbName });

      if (hooks.afterSeed) {
        await hooks.afterSeed({ tenantDb: tenantConn.db, connString: provisioned.connString, tenant, seed });
      }

      await markTenantActive(control.db, tenant.id, latestTenantSchemaVersion());
      await logProvisioningEvent(control.db, tenant.id, "onboarding_completed", true);

      return { tenant, connString: provisioned.connString, seed };
    } finally {
      await tenantConn.close();
    }
  } finally {
    await control.close();
  }
}
