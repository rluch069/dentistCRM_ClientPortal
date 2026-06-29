import { asc, eq } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import { operatories, providers, appointmentTypes, practices } from "@dentalos/db/tenant";
import type { AppointmentScope } from "@dentalos/core/constants";

export async function getOperatories(db: TenantDb) {
  return db.select().from(operatories).where(eq(operatories.isActive, true)).orderBy(asc(operatories.displayOrder));
}

export async function getProviders(db: TenantDb) {
  return db.select().from(providers).where(eq(providers.isActive, true)).orderBy(asc(providers.displayName));
}

export async function getAppointmentTypes(db: TenantDb, scope?: AppointmentScope) {
  const rows = await db
    .select()
    .from(appointmentTypes)
    .where(eq(appointmentTypes.isActive, true))
    .orderBy(asc(appointmentTypes.displayOrder));
  if (!scope) return rows;
  return rows.filter((t) => t.scope === "all" || t.scope === scope);
}

export async function getPractice(db: TenantDb) {
  return (await db.select().from(practices).limit(1))[0] ?? null;
}
