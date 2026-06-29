"use server";

import { acceptPlan, getPatient } from "@dentalos/api";
import { getPatientApiContext } from "@/lib/api";

export interface AcceptState {
  error?: string;
  ok?: boolean;
}

export async function acceptPlanAction(planId: string): Promise<AcceptState> {
  const ctx = await getPatientApiContext();
  if (!ctx || ctx.actor.kind !== "patient") return { error: "Please sign in again." };
  const data = await getPatient(ctx.db, ctx.actor.patientId);
  const name = data ? `${data.patient.firstName} ${data.patient.lastName}` : "Patient";
  try {
    await acceptPlan(ctx, planId, name);
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
