import { asc, desc, eq } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import { operatories, providers, appointmentTypes, practices } from "@dentalos/db/tenant";
import type { AppointmentScope } from "@dentalos/core/constants";
import type { schemas } from "@dentalos/core";
import type { Actor } from "./context";
import { writeAudit } from "./audit";

type AppointmentTypeInput = ReturnType<typeof schemas.appointmentTypeSchema.parse>;

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

// ── Appointment types — settings management ──────────────────────────────────

/** Like getAppointmentTypes, but includes inactive ones (for the settings screen). */
export async function listAppointmentTypesAll(db: TenantDb) {
  return db.select().from(appointmentTypes).orderBy(asc(appointmentTypes.displayOrder));
}

export async function createAppointmentType(db: TenantDb, actor: Actor, input: AppointmentTypeInput): Promise<string> {
  const [last] = await db
    .select({ displayOrder: appointmentTypes.displayOrder })
    .from(appointmentTypes)
    .orderBy(desc(appointmentTypes.displayOrder))
    .limit(1);
  const [row] = await db
    .insert(appointmentTypes)
    .values({
      name: input.name,
      durationMinutes: input.durationMinutes,
      scope: input.scope,
      color: input.color,
      recallIntervalMonths: input.recallIntervalMonths,
      displayOrder: (last?.displayOrder ?? -1) + 1,
    })
    .returning({ id: appointmentTypes.id });
  await writeAudit(db, actor, "appointment_type.create", "appointment_type", row!.id, { name: input.name });
  return row!.id;
}

export async function updateAppointmentType(
  db: TenantDb,
  actor: Actor,
  id: string,
  patch: Partial<AppointmentTypeInput>,
): Promise<void> {
  await db
    .update(appointmentTypes)
    .set({
      name: patch.name,
      durationMinutes: patch.durationMinutes,
      scope: patch.scope,
      color: patch.color,
      recallIntervalMonths: patch.recallIntervalMonths,
    })
    .where(eq(appointmentTypes.id, id));
  await writeAudit(db, actor, "appointment_type.update", "appointment_type", id, patch);
}

/** Soft delete/restore — appointments.appointmentTypeId is NOT NULL with onDelete: "restrict". */
export async function setAppointmentTypeActive(db: TenantDb, actor: Actor, id: string, isActive: boolean): Promise<void> {
  await db.update(appointmentTypes).set({ isActive }).where(eq(appointmentTypes.id, id));
  await writeAudit(db, actor, isActive ? "appointment_type.restore" : "appointment_type.delete", "appointment_type", id);
}
