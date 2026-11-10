"use server";

import { revalidatePath } from "next/cache";
import { createAppointmentType, updateAppointmentType, setAppointmentTypeActive } from "@dentalos/api";
import { schemas, type AppointmentScope } from "@dentalos/core";
import { getApiContext } from "@/lib/api";
import { requirePermission } from "@/lib/session";

export interface AppointmentTypeActionState {
  error?: string;
}

export interface AppointmentTypeFormInput {
  name: string;
  durationMinutes: number;
  scope: AppointmentScope;
  color: string;
}

export async function createAppointmentTypeAction(input: AppointmentTypeFormInput): Promise<AppointmentTypeActionState> {
  try {
    await requirePermission("settings:write");
    const parsed = schemas.appointmentTypeSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    const api = await getApiContext();
    await createAppointmentType(api.db, api.actor, parsed.data);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateAppointmentTypeAction(id: string, input: AppointmentTypeFormInput): Promise<AppointmentTypeActionState> {
  try {
    await requirePermission("settings:write");
    const parsed = schemas.appointmentTypeSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    const api = await getApiContext();
    await updateAppointmentType(api.db, api.actor, id, parsed.data);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function setAppointmentTypeActiveAction(id: string, isActive: boolean): Promise<AppointmentTypeActionState> {
  try {
    await requirePermission("settings:write");
    const api = await getApiContext();
    await setAppointmentTypeActive(api.db, api.actor, id, isActive);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
