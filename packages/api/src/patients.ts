import { desc, eq, ilike, or, sql } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import { patients, insurancePolicies, appointments, consents } from "@dentalos/db/tenant";
import type { Locale } from "@dentalos/core/constants";
import type { schemas } from "@dentalos/core";
import type { Actor } from "./context";
import { writeAudit } from "./audit";

type CreatePatientInput = ReturnType<typeof schemas.createPatientSchema.parse>;

export async function listPatients(db: TenantDb, opts: { search?: string; limit?: number } = {}) {
  const limit = opts.limit ?? 50;
  const q = opts.search?.trim();
  if (q) {
    const like = `%${q}%`;
    return db
      .select()
      .from(patients)
      .where(or(ilike(patients.firstName, like), ilike(patients.lastName, like), ilike(patients.phone, like)))
      .orderBy(patients.lastName, patients.firstName)
      .limit(limit);
  }
  return db.select().from(patients).orderBy(desc(patients.createdAt)).limit(limit);
}

export async function getPatient(db: TenantDb, id: string) {
  const rows = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  const patient = rows[0];
  if (!patient) return null;
  const policies = await db.select().from(insurancePolicies).where(eq(insurancePolicies.patientId, id));
  const appts = await db
    .select()
    .from(appointments)
    .where(eq(appointments.patientId, id))
    .orderBy(desc(appointments.startAt))
    .limit(20);
  return { patient, policies, appointments: appts };
}

export async function findPatientByPhone(db: TenantDb, phone: string) {
  const rows = await db.select().from(patients).where(eq(patients.phone, phone)).limit(1);
  return rows[0] ?? null;
}

export async function createPatient(db: TenantDb, actor: Actor, input: CreatePatientInput): Promise<string> {
  const [row] = await db
    .insert(patients)
    .values({
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender,
      phone: input.phone ?? null,
      email: input.email ?? null,
      locale: input.locale,
      address: input.address ?? null,
      medicalHistory: input.medicalHistory ?? null,
      allergies: input.allergies ?? null,
      householdId: input.householdId ?? null,
    })
    .returning({ id: patients.id });

  const patientId = row!.id;
  if (input.insurancePolicies.length > 0) {
    await db.insert(insurancePolicies).values(
      input.insurancePolicies.slice(0, 3).map((p, i) => ({
        patientId,
        insurerName: p.insurerName,
        policyNumber: p.policyNumber ?? null,
        memberName: p.memberName ?? null,
        estimatedCoveragePct: p.estimatedCoveragePct ?? null,
        priority: i + 1,
      })),
    );
  }
  await writeAudit(db, actor, "patient.create", "patient", patientId, { name: `${input.firstName} ${input.lastName}` });
  return patientId;
}

export async function updatePatient(
  db: TenantDb,
  actor: Actor,
  id: string,
  patch: Partial<CreatePatientInput>,
): Promise<void> {
  await db
    .update(patients)
    .set({
      firstName: patch.firstName,
      lastName: patch.lastName,
      dateOfBirth: patch.dateOfBirth,
      gender: patch.gender,
      phone: patch.phone,
      email: patch.email,
      locale: patch.locale,
      address: patch.address,
      medicalHistory: patch.medicalHistory,
      allergies: patch.allergies,
      updatedAt: new Date(),
    })
    .where(eq(patients.id, id));
  await writeAudit(db, actor, "patient.update", "patient", id);
}

export async function countPatients(db: TenantDb): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(patients);
  return row?.n ?? 0;
}

// ── Consents (DPA 2017: versioned, timestamped) ──────────────────────────────

export async function recordConsents(
  db: TenantDb,
  patientId: string,
  items: { type: string; granted: boolean }[],
  locale: Locale,
  ip?: string,
): Promise<void> {
  if (items.length === 0) return;
  await db.insert(consents).values(items.map((i) => ({ patientId, type: i.type, granted: i.granted, locale, ip })));
}

/** Most-recent consent decision per type. */
export async function getLatestConsents(db: TenantDb, patientId: string): Promise<Record<string, boolean>> {
  const rows = await db.select().from(consents).where(eq(consents.patientId, patientId)).orderBy(desc(consents.grantedAt));
  const map: Record<string, boolean> = {};
  for (const r of rows) if (!(r.type in map)) map[r.type] = r.granted;
  return map;
}
