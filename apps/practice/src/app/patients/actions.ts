"use server";

import { redirect } from "next/navigation";
import { createPatient } from "@dentalos/api";
import { schemas } from "@dentalos/core";
import { getTenantContext } from "@/lib/tenant";
import { requireStaff, toStaffActor } from "@/lib/session";

export interface NewPatientState {
  error?: string;
}

export async function createPatientAction(_prev: NewPatientState, formData: FormData): Promise<NewPatientState> {
  const session = await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) return { error: "No clinic context" };

  const str = (k: string) => {
    const v = (formData.get(k) as string | null)?.trim();
    return v ? v : undefined;
  };
  const insurerName = str("insurerName");
  const parsed = schemas.createPatientSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: str("dateOfBirth"),
    gender: formData.get("gender") || "unspecified",
    phone: str("phone"),
    email: str("email"),
    locale: formData.get("locale") || "en",
    address: str("address"),
    medicalHistory: str("medicalHistory"),
    allergies: str("allergies"),
    insurancePolicies: insurerName
      ? [{ insurerName, policyNumber: str("policyNumber"), estimatedCoveragePct: Number(str("coverage") ?? "0") || undefined }]
      : [],
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let id: string;
  try {
    id = await createPatient(ctx.db, toStaffActor(session), parsed.data);
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(`/patients/${id}`);
}
