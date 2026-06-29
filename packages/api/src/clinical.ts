import { and, asc, desc, eq, isNull, ne, sql } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import {
  procedures,
  toothConditions,
  treatmentPlans,
  clinicalNotes,
  prescriptions,
  prescriptionFavorites,
  diagnoses,
  providers,
  patients,
  practices,
} from "@dentalos/db/tenant";
import type { ProcedureStatus, TreatmentPlanStatus } from "@dentalos/core/constants";
import { formatMoney } from "@dentalos/core";
import { createNotifications } from "@dentalos/notifications";
import type { ApiContext, Actor } from "./context";
import { writeAudit } from "./audit";

/** Resolve the provider row id for the acting staff member (for clinical attribution). */
async function resolveProviderId(db: TenantDb, actor: Actor): Promise<string | null> {
  if (actor.kind !== "staff") return null;
  const rows = await db.select({ id: providers.id }).from(providers).where(eq(providers.staffUserId, actor.staffUserId)).limit(1);
  return rows[0]?.id ?? null;
}

// ── Charting ─────────────────────────────────────────────────────────────────

export interface PatientChart {
  conditions: (typeof toothConditions.$inferSelect)[];
  procedures: (typeof procedures.$inferSelect)[];
}

/** Active tooth conditions + non-deleted procedures for the odontogram. */
export async function getChart(db: TenantDb, patientId: string): Promise<PatientChart> {
  const [conds, procs] = await Promise.all([
    db.select().from(toothConditions).where(and(eq(toothConditions.patientId, patientId), isNull(toothConditions.resolvedAt))),
    db
      .select()
      .from(procedures)
      .where(and(eq(procedures.patientId, patientId), ne(procedures.status, "deleted")))
      .orderBy(desc(procedures.createdAt)),
  ]);
  return { conditions: conds, procedures: procs };
}

export async function addToothCondition(
  ctx: ApiContext,
  input: { patientId: string; toothFdi: number; conditionCode: string; note?: string },
): Promise<string> {
  const chartedByStaffId = ctx.actor.kind === "staff" ? ctx.actor.staffUserId : null;
  const [row] = await ctx.db
    .insert(toothConditions)
    .values({ patientId: input.patientId, toothFdi: input.toothFdi, conditionCode: input.conditionCode, note: input.note, chartedByStaffId })
    .returning({ id: toothConditions.id });
  await writeAudit(ctx.db, ctx.actor, "tooth_condition.add", "patient", input.patientId, { toothFdi: input.toothFdi, code: input.conditionCode });
  return row!.id;
}

export async function resolveToothCondition(ctx: ApiContext, conditionId: string): Promise<void> {
  await ctx.db.update(toothConditions).set({ resolvedAt: new Date() }).where(eq(toothConditions.id, conditionId));
  await writeAudit(ctx.db, ctx.actor, "tooth_condition.resolve", "tooth_condition", conditionId);
}

export interface ChartProcedureInput {
  patientId: string;
  code: string;
  name: string;
  toothFdi?: number;
  surfaces?: string[];
  status?: ProcedureStatus;
  feeCents: number;
  diagnosisId?: string;
  treatmentPlanId?: string;
  phase?: number;
  priority?: number;
  note?: string;
}

export async function chartProcedure(ctx: ApiContext, input: ChartProcedureInput): Promise<string> {
  const providerId = await resolveProviderId(ctx.db, ctx.actor);
  const status = input.status ?? "planned";
  const now = new Date();
  const [row] = await ctx.db
    .insert(procedures)
    .values({
      patientId: input.patientId,
      code: input.code,
      name: input.name,
      toothFdi: input.toothFdi ?? null,
      surfaces: input.surfaces ?? [],
      status,
      feeCents: input.feeCents,
      providerId,
      diagnosisId: input.diagnosisId ?? null,
      treatmentPlanId: input.treatmentPlanId ?? null,
      phase: input.phase ?? 1,
      priority: input.priority ?? 1,
      note: input.note ?? null,
      plannedAt: status === "planned" ? now : null,
      completedAt: status === "completed" ? now : null,
    })
    .returning({ id: procedures.id });
  if (input.treatmentPlanId) await recomputePlanTotal(ctx.db, input.treatmentPlanId);
  await writeAudit(ctx.db, ctx.actor, "procedure.chart", "patient", input.patientId, { code: input.code, toothFdi: input.toothFdi, status });
  return row!.id;
}

export async function setProcedureStatus(ctx: ApiContext, procedureId: string, status: ProcedureStatus): Promise<void> {
  const set: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === "completed") set.completedAt = new Date();
  await ctx.db.update(procedures).set(set).where(eq(procedures.id, procedureId));
  const proc = (await ctx.db.select({ planId: procedures.treatmentPlanId }).from(procedures).where(eq(procedures.id, procedureId)).limit(1))[0];
  if (proc?.planId) await recomputePlanTotal(ctx.db, proc.planId);
  await writeAudit(ctx.db, ctx.actor, "procedure.status", "procedure", procedureId, { status });
}

export async function softDeleteProcedure(ctx: ApiContext, procedureId: string): Promise<void> {
  const proc = (await ctx.db.select({ planId: procedures.treatmentPlanId }).from(procedures).where(eq(procedures.id, procedureId)).limit(1))[0];
  await ctx.db.update(procedures).set({ status: "deleted", updatedAt: new Date() }).where(eq(procedures.id, procedureId));
  if (proc?.planId) await recomputePlanTotal(ctx.db, proc.planId);
  await writeAudit(ctx.db, ctx.actor, "procedure.delete", "procedure", procedureId);
}

// ── Treatment plans ──────────────────────────────────────────────────────────

export async function createTreatmentPlan(ctx: ApiContext, input: { patientId: string; title?: string }): Promise<string> {
  const [row] = await ctx.db
    .insert(treatmentPlans)
    .values({ patientId: input.patientId, title: input.title ?? "Treatment Plan" })
    .returning({ id: treatmentPlans.id });
  await writeAudit(ctx.db, ctx.actor, "treatment_plan.create", "patient", input.patientId, { planId: row!.id });
  return row!.id;
}

export async function recomputePlanTotal(db: TenantDb, planId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${procedures.feeCents}), 0)::bigint` })
    .from(procedures)
    .where(and(eq(procedures.treatmentPlanId, planId), ne(procedures.status, "deleted")));
  const total = Number(row?.total ?? 0);
  await db.update(treatmentPlans).set({ totalCents: total, updatedAt: new Date() }).where(eq(treatmentPlans.id, planId));
  return total;
}

export async function setPlanStatus(ctx: ApiContext, planId: string, status: TreatmentPlanStatus): Promise<void> {
  await ctx.db.update(treatmentPlans).set({ status, updatedAt: new Date() }).where(eq(treatmentPlans.id, planId));
  await writeAudit(ctx.db, ctx.actor, "treatment_plan.status", "treatment_plan", planId, { status });
}

/** Accept a plan: snapshot its procedures + record signature. */
export async function acceptPlan(ctx: ApiContext, planId: string, signatureName: string): Promise<void> {
  const procs = await ctx.db.select().from(procedures).where(and(eq(procedures.treatmentPlanId, planId), ne(procedures.status, "deleted")));
  await ctx.db
    .update(treatmentPlans)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      signatureRef: signatureName,
      snapshot: { acceptedBy: signatureName, procedures: procs.map((p) => ({ code: p.code, name: p.name, toothFdi: p.toothFdi, feeCents: p.feeCents })) },
      updatedAt: new Date(),
    })
    .where(eq(treatmentPlans.id, planId));
  await writeAudit(ctx.db, ctx.actor, "treatment_plan.accept", "treatment_plan", planId, { signatureName });
}

/** Mark a plan proposed and notify the patient (portal link to review + accept). */
export async function shareTreatmentPlan(ctx: ApiContext, planId: string, portalLink?: string): Promise<void> {
  const plan = (await ctx.db.select().from(treatmentPlans).where(eq(treatmentPlans.id, planId)).limit(1))[0];
  if (!plan) throw new Error("Treatment plan not found");
  await ctx.db.update(treatmentPlans).set({ status: "proposed", updatedAt: new Date() }).where(eq(treatmentPlans.id, planId));

  const patient = (await ctx.db.select().from(patients).where(eq(patients.id, plan.patientId)).limit(1))[0];
  const practice = (await ctx.db.select().from(practices).limit(1))[0];
  if (patient && practice) {
    await createNotifications(ctx.db, {
      patientId: patient.id,
      type: "treatment_plan_shared",
      channels: ["sms", "email", "in_app"],
      locale: patient.locale,
      data: {
        clinicName: practice.name,
        patientName: patient.firstName,
        amount: formatMoney(plan.totalCents, patient.locale),
        link: portalLink,
      },
      dedupeKey: `plan_shared:${planId}`,
    });
  }
  await writeAudit(ctx.db, ctx.actor, "treatment_plan.share", "treatment_plan", planId);
}

export async function listPlans(db: TenantDb, patientId: string) {
  const plans = await db.select().from(treatmentPlans).where(eq(treatmentPlans.patientId, patientId)).orderBy(desc(treatmentPlans.createdAt));
  const planProcs = await db.select().from(procedures).where(and(eq(procedures.patientId, patientId), ne(procedures.status, "deleted")));
  return plans.map((p) => ({ ...p, procedures: planProcs.filter((pr) => pr.treatmentPlanId === p.id) }));
}

export async function getPlan(db: TenantDb, planId: string) {
  const plan = (await db.select().from(treatmentPlans).where(eq(treatmentPlans.id, planId)).limit(1))[0];
  if (!plan) return null;
  const procs = await db.select().from(procedures).where(and(eq(procedures.treatmentPlanId, planId), ne(procedures.status, "deleted")));
  return { ...plan, procedures: procs };
}

// ── Clinical notes (SOAP) ────────────────────────────────────────────────────

export interface CreateNoteInput {
  patientId: string;
  appointmentId?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export async function createClinicalNote(ctx: ApiContext, input: CreateNoteInput): Promise<string> {
  const providerId = await resolveProviderId(ctx.db, ctx.actor);
  const [row] = await ctx.db
    .insert(clinicalNotes)
    .values({
      patientId: input.patientId,
      appointmentId: input.appointmentId ?? null,
      providerId,
      subjective: input.subjective,
      objective: input.objective,
      assessment: input.assessment,
      plan: input.plan,
    })
    .returning({ id: clinicalNotes.id });
  await writeAudit(ctx.db, ctx.actor, "clinical_note.create", "patient", input.patientId, { noteId: row!.id });
  return row!.id;
}

export async function signNote(ctx: ApiContext, noteId: string): Promise<void> {
  const signedByStaffId = ctx.actor.kind === "staff" ? ctx.actor.staffUserId : null;
  await ctx.db.update(clinicalNotes).set({ signedAt: new Date(), signedByStaffId }).where(eq(clinicalNotes.id, noteId));
  await writeAudit(ctx.db, ctx.actor, "clinical_note.sign", "clinical_note", noteId);
}

export async function amendNote(ctx: ApiContext, noteId: string, patch: Partial<CreateNoteInput>): Promise<void> {
  await ctx.db
    .update(clinicalNotes)
    .set({ subjective: patch.subjective, objective: patch.objective, assessment: patch.assessment, plan: patch.plan, amendedAt: new Date() })
    .where(eq(clinicalNotes.id, noteId));
  await writeAudit(ctx.db, ctx.actor, "clinical_note.amend", "clinical_note", noteId);
}

export async function listNotes(db: TenantDb, patientId: string) {
  return db.select().from(clinicalNotes).where(eq(clinicalNotes.patientId, patientId)).orderBy(desc(clinicalNotes.createdAt));
}

// ── Prescriptions + diagnoses ────────────────────────────────────────────────

export interface CreatePrescriptionInput {
  patientId: string;
  items: Array<{ name: string; sig: string; quantity?: string }>;
  note?: string;
}

export async function createPrescription(ctx: ApiContext, input: CreatePrescriptionInput): Promise<string> {
  const providerId = await resolveProviderId(ctx.db, ctx.actor);
  const [row] = await ctx.db
    .insert(prescriptions)
    .values({ patientId: input.patientId, providerId, items: input.items, note: input.note })
    .returning({ id: prescriptions.id });
  await writeAudit(ctx.db, ctx.actor, "prescription.create", "patient", input.patientId, { rxId: row!.id });
  return row!.id;
}

export async function listPrescriptions(db: TenantDb, patientId: string) {
  return db.select().from(prescriptions).where(eq(prescriptions.patientId, patientId)).orderBy(desc(prescriptions.createdAt));
}

export async function getPrescription(db: TenantDb, id: string) {
  return (await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1))[0] ?? null;
}

export async function listPrescriptionFavorites(db: TenantDb) {
  return db.select().from(prescriptionFavorites).orderBy(asc(prescriptionFavorites.name));
}

export async function listDiagnoses(db: TenantDb) {
  return db.select().from(diagnoses).where(eq(diagnoses.isActive, true)).orderBy(asc(diagnoses.label));
}
