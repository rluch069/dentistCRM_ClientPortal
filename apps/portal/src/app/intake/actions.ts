"use server";

import { redirect } from "next/navigation";
import { updatePatient, recordConsents } from "@dentalos/api";
import { getPatientApiContext } from "@/lib/api";

export interface IntakeState {
  error?: string;
}

const CONSENT_TYPES = ["privacy", "sms", "email", "treatment"] as const;

export async function saveIntakeAction(_prev: IntakeState, formData: FormData): Promise<IntakeState> {
  const ctx = await getPatientApiContext();
  if (!ctx || ctx.actor.kind !== "patient") return { error: "Please sign in again." };
  const signature = String(formData.get("signature") ?? "").trim();
  if (!signature) return { error: "Please type your full name to sign." };

  const medicalHistory = String(formData.get("medicalHistory") ?? "").trim() || undefined;
  const allergies = String(formData.get("allergies") ?? "").trim() || undefined;
  await updatePatient(ctx.db, ctx.actor, ctx.actor.patientId, { medicalHistory, allergies });

  const items = CONSENT_TYPES.map((t) => ({ type: t, granted: formData.get(`consent_${t}`) === "on" }));
  await recordConsents(ctx.db, ctx.actor.patientId, items, ctx.tenant.locale);

  redirect("/records");
}
