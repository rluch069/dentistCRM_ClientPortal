import { and, eq, lte, or, isNull, desc } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import { notifications, patients, practices } from "@dentalos/db/tenant";
import type { Providers } from "@dentalos/providers";
import type { Locale, NotificationType, NotificationChannel } from "@dentalos/core/constants";
import { minutesIntoDay } from "@dentalos/core";
import { renderMessage, type TemplateData } from "./templates";

/** Quiet-hours window may wrap midnight (e.g. 21:00 → 07:00). */
function isQuietHour(minute: number, startMinute: number, endMinute: number): boolean {
  return startMinute <= endMinute ? minute >= startMinute && minute < endMinute : minute >= startMinute || minute < endMinute;
}

export interface CreateNotificationInput {
  patientId?: string;
  appointmentId?: string;
  type: NotificationType;
  channels: NotificationChannel[];
  locale?: Locale;
  data: TemplateData;
  scheduledFor?: Date | null;
  dedupeKey?: string;
}

/** Render + persist one notification row per channel (status queued, or in_app→sent if immediate). */
export async function createNotifications(db: TenantDb, input: CreateNotificationInput): Promise<string[]> {
  const locale = input.locale ?? "en";
  const rendered = renderMessage(input.type, locale, input.data);
  const ids: string[] = [];

  for (const channel of input.channels) {
    const body = channel === "email" ? rendered.emailText : rendered.sms;
    const immediateInApp = channel === "in_app" && !input.scheduledFor;
    const [row] = await db
      .insert(notifications)
      .values({
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        channel,
        type: input.type,
        status: immediateInApp ? "sent" : "queued",
        sentAt: immediateInApp ? new Date() : null,
        locale,
        subject: rendered.subject,
        body,
        scheduledFor: input.scheduledFor ?? null,
        dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${channel}` : null,
        payload: input.data as unknown as Record<string, unknown>,
      })
      .onConflictDoNothing({ target: notifications.dedupeKey })
      .returning({ id: notifications.id });
    if (row) ids.push(row.id);
  }
  return ids;
}

/** Send one queued notification via the right provider channel. */
export async function dispatchNotification(db: TenantDb, providers: Providers, notificationId: string): Promise<void> {
  const rows = await db.select().from(notifications).where(eq(notifications.id, notificationId)).limit(1);
  const n = rows[0];
  if (!n || n.status !== "queued") return;

  const patient = n.patientId
    ? (await db.select().from(patients).where(eq(patients.id, n.patientId)).limit(1))[0]
    : undefined;

  const fail = (error: string) =>
    db.update(notifications).set({ status: "failed", payload: { ...(n.payload ?? {}), error } }).where(eq(notifications.id, n.id));
  const sent = (providerRef?: string) =>
    db.update(notifications).set({ status: "sent", sentAt: new Date(), providerRef }).where(eq(notifications.id, n.id));
  const suppress = (reason: string) =>
    db.update(notifications).set({ status: "suppressed", payload: { ...(n.payload ?? {}), reason } }).where(eq(notifications.id, n.id));

  try {
    if (n.channel === "sms") {
      if (patient?.smsOptOut) return void (await suppress("sms_opt_out"));
      if (!patient?.phone) return void (await fail("no_phone"));
      const res = await providers.sms.send({ to: patient.phone, body: n.body });
      return void (res.status === "failed" ? await fail(res.error ?? "send_failed") : await sent(res.providerRef));
    }
    if (n.channel === "email") {
      if (patient?.emailOptOut) return void (await suppress("email_opt_out"));
      if (!patient?.email) return void (await fail("no_email"));
      const res = await providers.email.send({
        to: patient.email,
        subject: n.subject ?? "Notification",
        html: `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(n.body)}</pre>`,
        text: n.body,
      });
      return void (res.status === "failed" ? await fail(res.error ?? "send_failed") : await sent(res.providerRef));
    }
    // in_app
    await sent();
  } catch (err) {
    await fail((err as Error).message);
  }
}

/** Dispatch all due (queued, scheduledFor null or past) notifications. Returns count processed. */
export async function dispatchDueNotifications(
  db: TenantDb,
  providers: Providers,
  now: Date = new Date(),
  limit = 200,
): Promise<number> {
  // Quiet hours: defer SMS/email (not in-app) when within the clinic's quiet window.
  const practice = (await db.select().from(practices).limit(1))[0];
  const quietNow = practice
    ? isQuietHour(minutesIntoDay(now, practice.timezone), practice.quietHoursStartMinute, practice.quietHoursEndMinute)
    : false;

  const due = await db
    .select({ id: notifications.id, channel: notifications.channel })
    .from(notifications)
    .where(and(eq(notifications.status, "queued"), or(isNull(notifications.scheduledFor), lte(notifications.scheduledFor, now))))
    .limit(limit);

  let dispatched = 0;
  for (const row of due) {
    if (quietNow && (row.channel === "sms" || row.channel === "email")) continue; // stays queued for the next non-quiet tick
    await dispatchNotification(db, providers, row.id);
    dispatched++;
  }
  return dispatched;
}

export async function listPatientNotifications(db: TenantDb, patientId: string, limit = 50) {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.patientId, patientId), eq(notifications.channel, "in_app")))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(db: TenantDb, id: string): Promise<void> {
  await db.update(notifications).set({ status: "read", readAt: new Date() }).where(eq(notifications.id, id));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
