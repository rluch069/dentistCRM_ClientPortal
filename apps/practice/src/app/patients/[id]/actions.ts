"use server";

import {
  addToothCondition,
  resolveToothCondition,
  chartProcedure,
  setProcedureStatus,
  softDeleteProcedure,
  createTreatmentPlan,
  setPlanStatus,
  acceptPlan,
  shareTreatmentPlan,
  createClinicalNote,
  signNote,
  createPrescription,
  postCharge,
  createInvoiceFromProcedures,
  issueInvoice,
  recordPayment,
  createEstimate,
  createPerioExam,
  savePerioMeasures,
  type ChartProcedureInput,
  type CreateNoteInput,
  type PerioMeasureInput,
} from "@dentalos/api";
import type { ProcedureStatus, TreatmentPlanStatus, PaymentMethod } from "@dentalos/core/constants";
import { getApiContext } from "@/lib/api";

type Result<T = unknown> = { error?: string; data?: T };

async function run<T>(fn: (ctx: Awaited<ReturnType<typeof getApiContext>>) => Promise<T>): Promise<Result<T>> {
  try {
    const ctx = await getApiContext();
    return { data: await fn(ctx) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function addConditionAction(input: { patientId: string; toothFdi: number; conditionCode: string; note?: string }) {
  return run((ctx) => addToothCondition(ctx, input));
}

export async function resolveConditionAction(conditionId: string) {
  return run((ctx) => resolveToothCondition(ctx, conditionId));
}

export async function chartProcedureAction(input: ChartProcedureInput) {
  return run((ctx) => chartProcedure(ctx, input));
}

export async function setProcedureStatusAction(procedureId: string, status: ProcedureStatus) {
  return run((ctx) => setProcedureStatus(ctx, procedureId, status));
}

export async function deleteProcedureAction(procedureId: string) {
  return run((ctx) => softDeleteProcedure(ctx, procedureId));
}

export async function createPlanAction(patientId: string, title?: string) {
  return run((ctx) => createTreatmentPlan(ctx, { patientId, title }));
}

export async function setPlanStatusAction(planId: string, status: TreatmentPlanStatus) {
  return run((ctx) => setPlanStatus(ctx, planId, status));
}

export async function acceptPlanAction(planId: string, signatureName: string) {
  return run((ctx) => acceptPlan(ctx, planId, signatureName));
}

export async function sharePlanAction(planId: string) {
  return run((ctx) => shareTreatmentPlan(ctx, planId, `http://${ctx.tenant.slug}.localhost:3100/records`));
}

export async function createNoteAction(input: CreateNoteInput) {
  return run((ctx) => createClinicalNote(ctx, input));
}

export async function signNoteAction(noteId: string) {
  return run((ctx) => signNote(ctx, noteId));
}

export async function createRxAction(input: { patientId: string; items: Array<{ name: string; sig: string; quantity?: string }>; note?: string }) {
  return run((ctx) => createPrescription(ctx, input));
}

// ── Billing ──────────────────────────────────────────────────────────────────

export async function addChargeAction(patientId: string, description: string, amountCents: number) {
  return run((ctx) => postCharge(ctx, { patientId, description, amountCents }));
}

export async function createInvoiceFromProceduresAction(patientId: string, procedureIds: string[]) {
  return run((ctx) => createInvoiceFromProcedures(ctx, patientId, procedureIds));
}

export async function issueInvoiceAction(invoiceId: string) {
  return run((ctx) => issueInvoice(ctx, invoiceId));
}

export async function recordPaymentAction(input: { patientId: string; invoiceId?: string; amountCents: number; method: PaymentMethod; reference?: string }) {
  return run((ctx) => recordPayment(ctx, input));
}

export async function createEstimateAction(input: { patientId: string; treatmentPlanId?: string; totalCents: number; coveragePct?: number }) {
  return run((ctx) => createEstimate(ctx, input));
}

export async function createPerioExamAction(patientId: string, examDate: string) {
  return run((ctx) => createPerioExam(ctx, { patientId, examDate }));
}

export async function savePerioMeasuresAction(examId: string, measures: PerioMeasureInput[]) {
  return run((ctx) => savePerioMeasures(ctx, examId, measures));
}
