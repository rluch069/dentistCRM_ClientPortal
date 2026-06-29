import { eq } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import { appointmentTypes, slotHolds, patients } from "@dentalos/db/tenant";
import type { Providers } from "@dentalos/providers";
import { ymdInTz, type Locale } from "@dentalos/core";
import type { TenantInfo, PatientActor } from "./context";
import { computeAvailability } from "./availability";
import { createPatient } from "./patients";
import { createAppointment } from "./appointments";

export interface BookingServices {
  db: TenantDb;
  tenant: TenantInfo;
  providers: Providers;
}

export interface BookingIdentity {
  /** Existing patient id, or undefined for a brand-new patient. */
  patientId?: string;
  phone: string;
}

export interface ConfirmBookingInput {
  appointmentTypeId: string;
  providerId?: string | null;
  operatoryId?: string;
  startAt: string; // ISO UTC
  newPatient?: { firstName: string; lastName: string; email?: string; locale?: Locale };
  note?: string;
  portalLink?: string;
}

/** Reserve a slot for up to 10 minutes while the patient completes booking. */
export async function holdSlot(
  db: TenantDb,
  input: { operatoryId?: string; providerId?: string; startAt: Date; durationMinutes: number; phone?: string },
): Promise<string> {
  const end = new Date(input.startAt.getTime() + input.durationMinutes * 60_000);
  const heldUntil = new Date(Date.now() + 10 * 60_000);
  const [row] = await db
    .insert(slotHolds)
    .values({ operatoryId: input.operatoryId, providerId: input.providerId, startAt: input.startAt, endAt: end, heldUntil, phone: input.phone })
    .returning({ id: slotHolds.id });
  return row!.id;
}

export interface ConfirmBookingResult {
  appointmentId: string;
  patientId: string;
  patientName: string;
}

export async function confirmBooking(
  svc: BookingServices,
  identity: BookingIdentity,
  input: ConfirmBookingInput,
): Promise<ConfirmBookingResult> {
  const apptType = (await svc.db.select().from(appointmentTypes).where(eq(appointmentTypes.id, input.appointmentTypeId)).limit(1))[0];
  if (!apptType) throw new Error("Unknown appointment type");
  const start = new Date(input.startAt);

  // 1. Resolve the patient (existing or create new from the verified phone).
  let patientId = identity.patientId;
  if (!patientId) {
    if (!input.newPatient) throw new Error("New patient details are required");
    patientId = await createPatient(
      svc.db,
      { kind: "system" },
      {
        firstName: input.newPatient.firstName,
        lastName: input.newPatient.lastName,
        gender: "unspecified",
        phone: identity.phone,
        email: input.newPatient.email,
        locale: input.newPatient.locale ?? svc.tenant.locale,
        insurancePolicies: [],
      },
    );
  }

  // 2. Resolve provider + operatory (trust client hints, else recompute availability).
  let providerId = input.providerId ?? undefined;
  let operatoryId = input.operatoryId;
  if (!providerId || !operatoryId) {
    const ymd = ymdInTz(start, svc.tenant.timezone);
    const avail = await computeAvailability(svc.db, svc.tenant.timezone, {
      appointmentTypeId: input.appointmentTypeId,
      providerId: input.providerId ?? null,
      fromDate: ymd,
      days: 1,
    });
    const slot = avail[0]?.slots.find((s) => s.startAt === start.toISOString());
    if (!slot) throw new Error("That time slot is no longer available.");
    providerId = slot.providerId;
    operatoryId = slot.operatoryId;
  }

  // 3. Create the appointment (notify=true → confirmation + scheduled reminders).
  const actor: PatientActor = { kind: "patient", patientId, phone: identity.phone };
  const appointmentId = await createAppointment(
    { db: svc.db, tenant: svc.tenant, providers: svc.providers, actor },
    {
      patientId,
      providerId,
      operatoryId,
      appointmentTypeId: input.appointmentTypeId,
      startAt: start,
      durationMinutes: apptType.durationMinutes,
      note: input.note,
      bookedVia: "portal",
      notify: true,
      portalLink: input.portalLink,
    },
  );

  // 4. Release any holds for this phone.
  if (identity.phone) await svc.db.delete(slotHolds).where(eq(slotHolds.phone, identity.phone));

  const patient = (await svc.db.select().from(patients).where(eq(patients.id, patientId)).limit(1))[0];
  return { appointmentId, patientId, patientName: patient ? `${patient.firstName} ${patient.lastName}` : "" };
}

/** Upcoming + past appointments for a patient (portal history view). */
export async function getPatientPortalData(db: TenantDb, patientId: string) {
  const patient = (await db.select().from(patients).where(eq(patients.id, patientId)).limit(1))[0];
  return { patient };
}
