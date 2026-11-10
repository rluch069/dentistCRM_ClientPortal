"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { changeAppointmentStatus, createAppointment, createPatient, createAppointmentType, writeAudit } from "@dentalos/api";
import { waitlistEntries, patients, practices } from "@dentalos/db/tenant";
import { clinicLocalToUtc, schemas, type AppointmentStatus } from "@dentalos/core";
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
  patientId?: string;
  /** Book a walk-in who isn't in the system yet — created before the appointment. */
  newPatient?: { firstName: string; lastName: string; phone?: string; email?: string };
  providerId: string;
  operatoryId: string;
  appointmentTypeId?: string;
  /** "Other…" type picked in the dialog — persisted as a real appointment type so it's reusable. */
  customType?: { name: string; durationMinutes: number };
  date: string; // yyyy-mm-dd (clinic local)
  startMinute: number; // minutes from midnight
  durationMinutes: number;
  note?: string;
}

export async function createAppointmentAction(input: NewAppointmentInput): Promise<{ error?: string; id?: string }> {
  try {
    const api = await getApiContext();

    let patientId = input.patientId;
    if (input.newPatient) {
      const parsed = schemas.createPatientSchema.safeParse(input.newPatient);
      if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid patient details" };
      patientId = await createPatient(api.db, api.actor, parsed.data);
    }
    if (!patientId) return { error: "Select or add a patient." };

    let appointmentTypeId = input.appointmentTypeId;
    let durationMinutes = input.durationMinutes;
    if (input.customType) {
      const parsed = schemas.appointmentTypeSchema.safeParse({ ...input.customType, scope: "all" });
      if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid appointment type" };
      appointmentTypeId = await createAppointmentType(api.db, api.actor, parsed.data);
      durationMinutes = parsed.data.durationMinutes;
    }
    if (!appointmentTypeId) return { error: "Select or add an appointment type." };

    const startAt = clinicLocalToUtc(input.date, input.startMinute, api.tenant.timezone);
    const id = await createAppointment(api, {
      patientId,
      providerId: input.providerId,
      operatoryId: input.operatoryId,
      appointmentTypeId,
      startAt,
      durationMinutes,
      note: input.note,
      bookedVia: "staff",
      notify: true,
    });
    revalidatePath("/dashboard");
    revalidatePath("/patients");
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
    const link = `${process.env.PORTAL_URL ?? `http://${api.tenant.slug}.localhost:3100`}/book`;
    await api.providers.sms.send({ to: patient.phone, body: `${practice?.name ?? "Your clinic"}: a slot has opened up! Book now: ${link}` });
    await writeAudit(api.db, api.actor, "waitlist.notify", "waitlist_entry", entryId);
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
