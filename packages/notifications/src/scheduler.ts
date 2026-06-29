import type { TenantDb } from "@dentalos/db";
import { formatDate, formatTime, type Locale } from "@dentalos/core";
import type { NotificationChannel } from "@dentalos/core/constants";
import { createNotifications } from "./service";

export interface AppointmentNotifyContext {
  patientId: string;
  appointmentId: string;
  startAt: Date;
  locale: Locale;
  clinicName: string;
  timezone: string;
  patientName?: string;
  providerName?: string;
  link?: string;
}

const DEFAULT_CHANNELS: NotificationChannel[] = ["sms", "email", "in_app"];

function buildData(ctx: AppointmentNotifyContext) {
  return {
    clinicName: ctx.clinicName,
    patientName: ctx.patientName,
    date: formatDate(ctx.startAt, ctx.timezone, ctx.locale),
    time: formatTime(ctx.startAt, ctx.timezone, ctx.locale),
    providerName: ctx.providerName,
    link: ctx.link,
  };
}

/** Immediate booking confirmation across channels. */
export async function sendBookingConfirmation(
  db: TenantDb,
  ctx: AppointmentNotifyContext,
  channels: NotificationChannel[] = DEFAULT_CHANNELS,
): Promise<void> {
  await createNotifications(db, {
    patientId: ctx.patientId,
    appointmentId: ctx.appointmentId,
    type: "appointment_booked",
    channels,
    locale: ctx.locale,
    data: buildData(ctx),
    dedupeKey: `booked:${ctx.appointmentId}`,
  });
}

/** Schedule layered reminders (offsets in hours before the appointment). */
export async function scheduleAppointmentReminders(
  db: TenantDb,
  ctx: AppointmentNotifyContext,
  reminderOffsetsHours: number[],
  channels: NotificationChannel[] = DEFAULT_CHANNELS,
): Promise<void> {
  const data = buildData(ctx);
  for (const offsetHours of reminderOffsetsHours) {
    const scheduledFor = new Date(ctx.startAt.getTime() - offsetHours * 3_600_000);
    if (scheduledFor.getTime() <= Date.now()) continue; // skip offsets already in the past
    await createNotifications(db, {
      patientId: ctx.patientId,
      appointmentId: ctx.appointmentId,
      type: "appointment_reminder",
      channels,
      locale: ctx.locale,
      data,
      scheduledFor,
      dedupeKey: `reminder:${ctx.appointmentId}:${offsetHours}`,
    });
  }
}
