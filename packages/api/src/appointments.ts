import { and, eq, lt, gt, ne, inArray, asc } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import {
  appointments,
  appointmentStatusHistory,
  appointmentTypes,
  patients,
  providers,
  operatories,
  practices,
} from "@dentalos/db/tenant";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  canTransition,
  addMonths,
  clinicLocalToUtc,
  addDaysYmd,
  intervalsOverlap,
  formatDate,
  formatTime,
  type AppointmentStatus,
} from "@dentalos/core";
import { sendBookingConfirmation, scheduleAppointmentReminders, createNotifications } from "@dentalos/notifications";
import type { ApiContext } from "./context";
import { writeAudit } from "./audit";

export interface DayAppointment {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  operatoryId: string;
  appointmentTypeId: string;
  typeName: string;
  typeColor: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  note: string | null;
  bookedVia: string;
}

/** All appointments overlapping a clinic-local day, enriched for the calendar cockpit. */
export async function listDayAppointments(db: TenantDb, timezone: string, dateYmd: string): Promise<DayAppointment[]> {
  return getAppointmentsInRange(db, timezone, dateYmd, dateYmd);
}

/** All appointments overlapping the inclusive clinic-local date range [fromYmd, toYmd]. */
export async function getAppointmentsInRange(
  db: TenantDb,
  timezone: string,
  fromYmd: string,
  toYmd: string,
): Promise<DayAppointment[]> {
  const dayStart = clinicLocalToUtc(fromYmd, 0, timezone);
  const dayEnd = clinicLocalToUtc(addDaysYmd(toYmd, 1), 0, timezone);
  const rows = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      patientFirst: patients.firstName,
      patientLast: patients.lastName,
      providerId: appointments.providerId,
      providerName: providers.displayName,
      operatoryId: appointments.operatoryId,
      appointmentTypeId: appointments.appointmentTypeId,
      typeName: appointmentTypes.name,
      typeColor: appointmentTypes.color,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      status: appointments.status,
      note: appointments.note,
      bookedVia: appointments.bookedVia,
    })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .innerJoin(providers, eq(providers.id, appointments.providerId))
    .innerJoin(appointmentTypes, eq(appointmentTypes.id, appointments.appointmentTypeId))
    .where(and(lt(appointments.startAt, dayEnd), gt(appointments.endAt, dayStart)))
    .orderBy(asc(appointments.startAt));

  return rows.map((r) => ({
    id: r.id,
    patientId: r.patientId,
    patientName: `${r.patientFirst} ${r.patientLast}`,
    providerId: r.providerId,
    providerName: r.providerName,
    operatoryId: r.operatoryId,
    appointmentTypeId: r.appointmentTypeId,
    typeName: r.typeName,
    typeColor: r.typeColor,
    startAt: r.startAt.toISOString(),
    endAt: r.endAt.toISOString(),
    status: r.status,
    note: r.note,
    bookedVia: r.bookedVia,
  }));
}

/** True if the (provider, operatory) is free for [start,end), optionally excluding one appointment. */
export async function hasConflict(
  db: TenantDb,
  providerId: string,
  operatoryId: string,
  start: Date,
  end: Date,
  excludeId?: string,
): Promise<boolean> {
  const overlapping = await db
    .select({ id: appointments.id, providerId: appointments.providerId, operatoryId: appointments.operatoryId, startAt: appointments.startAt, endAt: appointments.endAt })
    .from(appointments)
    .where(and(inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES), lt(appointments.startAt, end), gt(appointments.endAt, start), excludeId ? ne(appointments.id, excludeId) : undefined));
  return overlapping.some(
    (a) => (a.providerId === providerId || a.operatoryId === operatoryId) && intervalsOverlap(start, end, a.startAt, a.endAt),
  );
}

export interface CreateAppointmentInput {
  patientId: string;
  providerId: string;
  operatoryId: string;
  appointmentTypeId: string;
  startAt: Date;
  durationMinutes: number;
  note?: string;
  bookedVia?: "staff" | "portal";
  notify?: boolean;
  portalLink?: string;
}

export async function createAppointment(ctx: ApiContext, input: CreateAppointmentInput): Promise<string> {
  const { db } = ctx;
  const end = new Date(input.startAt.getTime() + input.durationMinutes * 60_000);
  if (await hasConflict(db, input.providerId, input.operatoryId, input.startAt, end)) {
    throw new Error("That time slot is no longer available.");
  }
  const createdByStaffId = ctx.actor.kind === "staff" ? ctx.actor.staffUserId : null;
  const [row] = await db
    .insert(appointments)
    .values({
      patientId: input.patientId,
      providerId: input.providerId,
      operatoryId: input.operatoryId,
      appointmentTypeId: input.appointmentTypeId,
      startAt: input.startAt,
      endAt: end,
      durationMinutes: input.durationMinutes,
      status: "booked",
      note: input.note ?? null,
      bookedVia: input.bookedVia ?? "staff",
      createdByStaffId,
    })
    .returning({ id: appointments.id });
  const apptId = row!.id;
  await db.insert(appointmentStatusHistory).values({ appointmentId: apptId, fromStatus: null, toStatus: "booked", changedByStaffId: createdByStaffId });
  await writeAudit(db, ctx.actor, "appointment.create", "appointment", apptId, { startAt: input.startAt.toISOString() });

  if (input.notify) {
    await notifyBooked(ctx, apptId, input.patientId, input.providerId, input.startAt, input.portalLink);
  }
  return apptId;
}

async function notifyBooked(ctx: ApiContext, apptId: string, patientId: string, providerId: string, startAt: Date, link?: string) {
  const { db } = ctx;
  const patient = (await db.select().from(patients).where(eq(patients.id, patientId)).limit(1))[0];
  const provider = (await db.select().from(providers).where(eq(providers.id, providerId)).limit(1))[0];
  const practice = (await db.select().from(practices).limit(1))[0];
  if (!patient || !practice) return;
  const notifyCtx = {
    patientId,
    appointmentId: apptId,
    startAt,
    locale: patient.locale,
    clinicName: practice.name,
    timezone: practice.timezone,
    patientName: patient.firstName,
    providerName: provider?.displayName,
    link,
  };
  await sendBookingConfirmation(db, notifyCtx);
  await scheduleAppointmentReminders(db, notifyCtx, practice.reminderOffsetsHours);
}

export interface RescheduleInput {
  appointmentId: string;
  startAt: Date;
  operatoryId?: string;
  providerId?: string;
  durationMinutes?: number;
}

export async function rescheduleAppointment(ctx: ApiContext, input: RescheduleInput): Promise<void> {
  const { db } = ctx;
  const current = (await db.select().from(appointments).where(eq(appointments.id, input.appointmentId)).limit(1))[0];
  if (!current) throw new Error("Appointment not found");
  const providerId = input.providerId ?? current.providerId;
  const operatoryId = input.operatoryId ?? current.operatoryId;
  const duration = input.durationMinutes ?? current.durationMinutes;
  const end = new Date(input.startAt.getTime() + duration * 60_000);
  if (await hasConflict(db, providerId, operatoryId, input.startAt, end, current.id)) {
    throw new Error("That time slot is no longer available.");
  }
  await db
    .update(appointments)
    .set({ startAt: input.startAt, endAt: end, providerId, operatoryId, durationMinutes: duration, updatedAt: new Date() })
    .where(eq(appointments.id, current.id));
  await writeAudit(db, ctx.actor, "appointment.reschedule", "appointment", current.id, { startAt: input.startAt.toISOString() });

  const patient = (await db.select().from(patients).where(eq(patients.id, current.patientId)).limit(1))[0];
  const provider = (await db.select().from(providers).where(eq(providers.id, providerId)).limit(1))[0];
  const practice = (await db.select().from(practices).limit(1))[0];
  if (patient && practice) {
    await createNotifications(db, {
      patientId: patient.id,
      appointmentId: current.id,
      type: "appointment_rescheduled",
      channels: ["sms", "email", "in_app"],
      locale: patient.locale,
      data: {
        clinicName: practice.name,
        patientName: patient.firstName,
        date: formatDate(input.startAt, practice.timezone, patient.locale),
        time: formatTime(input.startAt, practice.timezone, patient.locale),
        providerName: provider?.displayName,
      },
    });
  }
}

const STATUS_TIMESTAMP: Partial<Record<AppointmentStatus, keyof typeof appointments.$inferInsert>> = {
  confirmed: "confirmedAt",
  arrived: "arrivedAt",
  seated: "seatedAt",
  completed: "completedAt",
  cancelled: "cancelledAt",
};

export async function changeAppointmentStatus(
  ctx: ApiContext,
  input: { appointmentId: string; status: AppointmentStatus; reason?: string; force?: boolean },
): Promise<void> {
  const { db } = ctx;
  const current = (await db.select().from(appointments).where(eq(appointments.id, input.appointmentId)).limit(1))[0];
  if (!current) throw new Error("Appointment not found");
  if (!input.force && !canTransition(current.status, input.status)) {
    throw new Error(`Cannot change status from ${current.status} to ${input.status}`);
  }

  const set: Record<string, unknown> = { status: input.status, updatedAt: new Date() };
  const tsField = STATUS_TIMESTAMP[input.status];
  if (tsField) set[tsField] = new Date();
  await db.update(appointments).set(set).where(eq(appointments.id, current.id));
  const changedByStaffId = ctx.actor.kind === "staff" ? ctx.actor.staffUserId : null;
  await db.insert(appointmentStatusHistory).values({ appointmentId: current.id, fromStatus: current.status, toStatus: input.status, reason: input.reason, changedByStaffId });
  await writeAudit(db, ctx.actor, "appointment.status", "appointment", current.id, { from: current.status, to: input.status });

  if (input.status === "completed") {
    await applyVisitCompletion(db, current.patientId, current.appointmentTypeId, current.startAt);
  }
}

/** On completion, stamp last visit and compute the next recall date from the appointment type. */
async function applyVisitCompletion(db: TenantDb, patientId: string, appointmentTypeId: string, visitAt: Date) {
  const type = (await db.select().from(appointmentTypes).where(eq(appointmentTypes.id, appointmentTypeId)).limit(1))[0];
  const nextRecallAt = type?.recallIntervalMonths ? addMonths(visitAt, type.recallIntervalMonths) : null;
  await db.update(patients).set({ lastVisitAt: visitAt, ...(nextRecallAt ? { nextRecallAt } : {}) }).where(eq(patients.id, patientId));
}
