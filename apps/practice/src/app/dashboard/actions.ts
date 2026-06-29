"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { changeAppointmentStatus, createAppointment, writeAudit } from "@dentalos/api";
import { waitlistEntries, patients, practices } from "@dentalos/db/tenant";
import { clinicLocalToUtc, type AppointmentStatus } from "@dentalos/core";
import { getApiContext } from "@/lib/api";

export async function setStatusAction(appointmentId: string, status: AppointmentStatus): Promise<{ error?: string }> {
  try {
    const api = await getApiContext();
    await changeAppointmentStatus(api, { appointmentId, status });
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export interface NewAppointmentInput {
  patientId: string;
  providerId: string;
  operatoryId: string;
  appointmentTypeId: string;
  date: string; // yyyy-mm-dd (clinic local)
  startMinute: number; // minutes from midnight
  durationMinutes: number;
  note?: string;
}

export async function createAppointmentAction(input: NewAppointmentInput): Promise<{ error?: string; id?: string }> {
  try {
    const api = await getApiContext();
    const startAt = clinicLocalToUtc(input.date, input.startMinute, api.tenant.timezone);
    const id = await createAppointment(api, {
      patientId: input.patientId,
      providerId: input.providerId,
      operatoryId: input.operatoryId,
      appointmentTypeId: input.appointmentTypeId,
      startAt,
      durationMinutes: input.durationMinutes,
      note: input.note,
      bookedVia: "staff",
      notify: true,
    });
    revalidatePath("/dashboard");
    return { id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function notifyWaitlistAction(entryId: string): Promise<{ error?: string }> {
  try {
    const api = await getApiContext();
    const entry = (await api.db.select().from(waitlistEntries).where(eq(waitlistEntries.id, entryId)).limit(1))[0];
    if (!entry) return { error: "Waitlist entry not found" };
    const patient = (await api.db.select().from(patients).where(eq(patients.id, entry.patientId)).limit(1))[0];
    const practice = (await api.db.select().from(practices).limit(1))[0];
    if (!patient?.phone) return { error: "Patient has no phone number" };
    const link = `http://${api.tenant.slug}.localhost:3100/book`;
    await api.providers.sms.send({ to: patient.phone, body: `${practice?.name ?? "Your clinic"}: a slot has opened up! Book now: ${link}` });
    await writeAudit(api.db, api.actor, "waitlist.notify", "waitlist_entry", entryId);
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
