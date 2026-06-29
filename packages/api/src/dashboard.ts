import { and, desc, eq, asc } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import { appointments, appointmentTypes, providers, waitlistEntries, patients } from "@dentalos/db/tenant";
import { ACTIVE_APPOINTMENT_STATUSES, type AppointmentStatus } from "@dentalos/core";
import { listDayAppointments, type DayAppointment } from "./appointments";
import { getOperatories, getProviders } from "./resources";

export interface WaitlistItem {
  id: string;
  patientId: string;
  patientName: string;
  phone: string | null;
  typeName: string | null;
  asap: boolean;
}

export async function listOpenWaitlist(db: TenantDb): Promise<WaitlistItem[]> {
  const rows = await db
    .select({
      id: waitlistEntries.id,
      patientId: waitlistEntries.patientId,
      first: patients.firstName,
      last: patients.lastName,
      phone: patients.phone,
      typeName: appointmentTypes.name,
      asap: waitlistEntries.asap,
    })
    .from(waitlistEntries)
    .innerJoin(patients, eq(patients.id, waitlistEntries.patientId))
    .leftJoin(appointmentTypes, eq(appointmentTypes.id, waitlistEntries.appointmentTypeId))
    .where(eq(waitlistEntries.status, "open"))
    .orderBy(desc(waitlistEntries.asap), asc(waitlistEntries.createdAt));
  return rows.map((r) => ({ id: r.id, patientId: r.patientId, patientName: `${r.first} ${r.last}`, phone: r.phone, typeName: r.typeName, asap: r.asap }));
}

export interface ActionPanel {
  nextUp: DayAppointment | null;
  confirmationsDue: DayAppointment[];
  arrived: DayAppointment[];
  stats: { total: number; completed: number; noShow: number; remaining: number };
}

export interface CockpitData {
  date: string;
  operatories: Awaited<ReturnType<typeof getOperatories>>;
  providers: Awaited<ReturnType<typeof getProviders>>;
  appointments: DayAppointment[];
  actionPanel: ActionPanel;
  waitlist: WaitlistItem[];
}

/** Everything the practice home-page cockpit renders for a given clinic-local day. */
export async function getCockpit(db: TenantDb, timezone: string, dateYmd: string): Promise<CockpitData> {
  const [ops, provs, appts, waitlist] = await Promise.all([
    getOperatories(db),
    getProviders(db),
    listDayAppointments(db, timezone, dateYmd),
    listOpenWaitlist(db),
  ]);
  const now = Date.now();
  const confirmationsDue = appts.filter((a) => a.status === "booked");
  const arrived = appts.filter((a) => a.status === "arrived");
  const upcoming = appts
    .filter((a) => (a.status === "booked" || a.status === "confirmed") && new Date(a.startAt).getTime() >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const remaining = appts.filter((a) => (ACTIVE_APPOINTMENT_STATUSES as AppointmentStatus[]).includes(a.status)).length;

  return {
    date: dateYmd,
    operatories: ops,
    providers: provs,
    appointments: appts,
    waitlist,
    actionPanel: {
      nextUp: upcoming[0] ?? null,
      confirmationsDue,
      arrived,
      stats: {
        total: appts.length,
        completed: appts.filter((a) => a.status === "completed").length,
        noShow: appts.filter((a) => a.status === "no_show").length,
        remaining,
      },
    },
  };
}

export interface PatientAppointmentView {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  typeName: string;
  typeColor: string;
  providerName: string;
}

/** Patient portal: split upcoming vs past appointments, enriched. */
export async function listPatientAppointments(
  db: TenantDb,
  patientId: string,
): Promise<{ upcoming: PatientAppointmentView[]; past: PatientAppointmentView[] }> {
  const rows = await db
    .select({
      id: appointments.id,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      status: appointments.status,
      typeName: appointmentTypes.name,
      typeColor: appointmentTypes.color,
      providerName: providers.displayName,
    })
    .from(appointments)
    .innerJoin(appointmentTypes, eq(appointmentTypes.id, appointments.appointmentTypeId))
    .innerJoin(providers, eq(providers.id, appointments.providerId))
    .where(eq(appointments.patientId, patientId))
    .orderBy(desc(appointments.startAt));

  const now = Date.now();
  const view = (r: (typeof rows)[number]): PatientAppointmentView => ({
    id: r.id,
    startAt: r.startAt.toISOString(),
    endAt: r.endAt.toISOString(),
    status: r.status,
    typeName: r.typeName,
    typeColor: r.typeColor,
    providerName: r.providerName,
  });
  const upcoming = rows
    .filter((r) => (ACTIVE_APPOINTMENT_STATUSES as AppointmentStatus[]).includes(r.status) && r.startAt.getTime() >= now)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    .map(view);
  const past = rows.filter((r) => !(upcoming.find((u) => u.id === r.id))).map(view);
  return { upcoming, past };
}
