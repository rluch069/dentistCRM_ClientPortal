import { and, eq, lt, gt, inArray } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import {
  appointmentTypes,
  providers as providersTable,
  operatories as operatoriesTable,
  providerHours,
  operatoryHours,
  appointments,
  blockouts,
  slotHolds,
} from "@dentalos/db/tenant";
import {
  clinicLocalToUtc,
  dayOfWeekForYmd,
  addDaysYmd,
  intervalsOverlap,
  ACTIVE_APPOINTMENT_STATUSES,
} from "@dentalos/core";

export interface SlotOption {
  startAt: string; // ISO UTC
  endAt: string;
  providerId: string;
  operatoryId: string;
}
export interface DayAvailability {
  date: string; // yyyy-mm-dd (clinic local)
  slots: SlotOption[];
}
export interface AvailabilityQuery {
  appointmentTypeId: string;
  providerId?: string | null;
  fromDate: string; // yyyy-mm-dd
  days: number;
}

const SLOT_STEP_MINUTES = 15;

export async function computeAvailability(
  db: TenantDb,
  timezone: string,
  query: AvailabilityQuery,
): Promise<DayAvailability[]> {
  const apptType = (await db.select().from(appointmentTypes).where(eq(appointmentTypes.id, query.appointmentTypeId)).limit(1))[0];
  if (!apptType) return [];
  const duration = apptType.durationMinutes;

  const provs = (await db.select().from(providersTable).where(eq(providersTable.isActive, true))).filter(
    (p) => !query.providerId || p.id === query.providerId,
  );
  const ops = await db.select().from(operatoriesTable).where(eq(operatoriesTable.isActive, true));
  if (provs.length === 0 || ops.length === 0) return [];

  const allProvHours = await db.select().from(providerHours);
  const allOpHours = await db.select().from(operatoryHours);
  const provHourMap = new Map<string, { start: number; end: number }>();
  for (const h of allProvHours) provHourMap.set(`${h.providerId}:${h.dayOfWeek}`, { start: h.startMinute, end: h.endMinute });
  const opHourMap = new Map<string, { start: number; end: number }>();
  for (const h of allOpHours) opHourMap.set(`${h.operatoryId}:${h.dayOfWeek}`, { start: h.openMinute, end: h.closeMinute });

  const rangeStart = clinicLocalToUtc(query.fromDate, 0, timezone);
  const rangeEnd = clinicLocalToUtc(addDaysYmd(query.fromDate, query.days), 0, timezone);
  const now = new Date();

  const busyAppts = await db
    .select({ providerId: appointments.providerId, operatoryId: appointments.operatoryId, startAt: appointments.startAt, endAt: appointments.endAt })
    .from(appointments)
    .where(and(inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES), lt(appointments.startAt, rangeEnd), gt(appointments.endAt, rangeStart)));
  const busyBlockouts = await db
    .select()
    .from(blockouts)
    .where(and(lt(blockouts.startAt, rangeEnd), gt(blockouts.endAt, rangeStart)));
  const activeHolds = await db
    .select()
    .from(slotHolds)
    .where(and(gt(slotHolds.heldUntil, now), lt(slotHolds.startAt, rangeEnd), gt(slotHolds.endAt, rangeStart)));

  const result: DayAvailability[] = [];
  for (let d = 0; d < query.days; d++) {
    const date = addDaysYmd(query.fromDate, d);
    const dow = dayOfWeekForYmd(date);
    const slotMap = new Map<string, SlotOption>();

    for (const prov of provs) {
      const ph = provHourMap.get(`${prov.id}:${dow}`);
      if (!ph) continue;
      for (const op of ops) {
        const oh = opHourMap.get(`${op.id}:${dow}`);
        if (!oh) continue;
        const windowStart = Math.max(ph.start, oh.start);
        const windowEnd = Math.min(ph.end, oh.end);
        for (let m = windowStart; m + duration <= windowEnd; m += SLOT_STEP_MINUTES) {
          const start = clinicLocalToUtc(date, m, timezone);
          if (start.getTime() <= now.getTime()) continue;
          const end = new Date(start.getTime() + duration * 60_000);
          const iso = start.toISOString();
          if (slotMap.has(iso)) continue;
          if (isBusy(prov.id, op.id, start, end, busyAppts, busyBlockouts, activeHolds)) continue;
          slotMap.set(iso, { startAt: iso, endAt: end.toISOString(), providerId: prov.id, operatoryId: op.id });
        }
      }
    }
    const slots = [...slotMap.values()].sort((a, b) => a.startAt.localeCompare(b.startAt));
    result.push({ date, slots });
  }
  return result;
}

function isBusy(
  providerId: string,
  operatoryId: string,
  start: Date,
  end: Date,
  appts: { providerId: string; operatoryId: string; startAt: Date; endAt: Date }[],
  blocks: { providerId: string | null; operatoryId: string | null; startAt: Date; endAt: Date }[],
  holds: { providerId: string | null; operatoryId: string | null; startAt: Date; endAt: Date }[],
): boolean {
  for (const a of appts) {
    if ((a.providerId === providerId || a.operatoryId === operatoryId) && intervalsOverlap(start, end, a.startAt, a.endAt)) return true;
  }
  for (const b of blocks) {
    const applies = (b.providerId == null && b.operatoryId == null) || b.providerId === providerId || b.operatoryId === operatoryId;
    if (applies && intervalsOverlap(start, end, b.startAt, b.endAt)) return true;
  }
  for (const h of holds) {
    if (h.operatoryId === operatoryId && intervalsOverlap(start, end, h.startAt, h.endAt)) return true;
  }
  return false;
}
