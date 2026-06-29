import { and, eq, gte, lt, ne, sql, isNotNull, lte } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import { procedures, payments, patients, appointments } from "@dentalos/db/tenant";
import { clinicLocalToUtc, addDaysYmd, ymdInTz } from "@dentalos/core";

export interface ReportSummary {
  from: string;
  to: string;
  productionCents: number;
  collectionsCents: number;
  outstandingCents: number;
  appointments: { total: number; completed: number; noShow: number; cancelled: number };
  noShowRate: number; // 0..1
  newPatients: number;
  recallDue: number;
}

/** KPIs over an inclusive clinic-local date range [from, to]. */
export async function getReportSummary(db: TenantDb, timezone: string, from: string, to: string): Promise<ReportSummary> {
  const start = clinicLocalToUtc(from, 0, timezone);
  const end = clinicLocalToUtc(addDaysYmd(to, 1), 0, timezone); // exclusive

  const [prod] = await db
    .select({ total: sql<number>`coalesce(sum(${procedures.feeCents}), 0)::bigint` })
    .from(procedures)
    .where(and(eq(procedures.status, "completed"), isNotNull(procedures.completedAt), gte(procedures.completedAt, start), lt(procedures.completedAt, end)));

  const [coll] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::bigint` })
    .from(payments)
    .where(and(eq(payments.status, "captured"), gte(payments.createdAt, start), lt(payments.createdAt, end)));

  const [out] = await db
    .select({ total: sql<number>`coalesce(sum(${patients.balanceCents}), 0)::bigint` })
    .from(patients)
    .where(sql`${patients.balanceCents} > 0`);

  const apptRows = await db
    .select({ status: appointments.status, n: sql<number>`count(*)::int` })
    .from(appointments)
    .where(and(gte(appointments.startAt, start), lt(appointments.startAt, end)))
    .groupBy(appointments.status);
  const byStatus = Object.fromEntries(apptRows.map((r) => [r.status, r.n]));
  const total = apptRows.reduce((s, r) => s + r.n, 0);
  const completed = byStatus["completed"] ?? 0;
  const noShow = byStatus["no_show"] ?? 0;
  const cancelled = byStatus["cancelled"] ?? 0;

  const [np] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(patients)
    .where(and(gte(patients.createdAt, start), lt(patients.createdAt, end)));

  const [rc] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(patients)
    .where(and(isNotNull(patients.nextRecallAt), lte(patients.nextRecallAt, new Date())));

  return {
    from,
    to,
    productionCents: Number(prod?.total ?? 0),
    collectionsCents: Number(coll?.total ?? 0),
    outstandingCents: Number(out?.total ?? 0),
    appointments: { total, completed, noShow, cancelled },
    noShowRate: total > 0 ? noShow / total : 0,
    newPatients: np?.n ?? 0,
    recallDue: rc?.n ?? 0,
  };
}

export interface DailyBucket {
  date: string;
  productionCents: number;
  collectionsCents: number;
}

/** Per-day production + collections, bucketed in clinic-local time. */
export async function getDailyBreakdown(db: TenantDb, timezone: string, from: string, to: string): Promise<DailyBucket[]> {
  const start = clinicLocalToUtc(from, 0, timezone);
  const end = clinicLocalToUtc(addDaysYmd(to, 1), 0, timezone);

  const procs = await db
    .select({ completedAt: procedures.completedAt, fee: procedures.feeCents })
    .from(procedures)
    .where(and(eq(procedures.status, "completed"), isNotNull(procedures.completedAt), gte(procedures.completedAt, start), lt(procedures.completedAt, end)));
  const pays = await db
    .select({ createdAt: payments.createdAt, amount: payments.amountCents })
    .from(payments)
    .where(and(eq(payments.status, "captured"), gte(payments.createdAt, start), lt(payments.createdAt, end)));

  const buckets = new Map<string, DailyBucket>();
  for (let d = from; d <= to; d = addDaysYmd(d, 1)) buckets.set(d, { date: d, productionCents: 0, collectionsCents: 0 });
  for (const p of procs) {
    if (!p.completedAt) continue;
    const k = ymdInTz(p.completedAt, timezone);
    const b = buckets.get(k);
    if (b) b.productionCents += p.fee;
  }
  for (const p of pays) {
    const k = ymdInTz(p.createdAt, timezone);
    const b = buckets.get(k);
    if (b) b.collectionsCents += p.amount;
  }
  return [...buckets.values()];
}

/** CSV export of the daily breakdown (amounts in MUR). */
export function reportToCsv(daily: DailyBucket[]): string {
  const rows = [["Date", "Production (MUR)", "Collections (MUR)"]];
  for (const b of daily) rows.push([b.date, (b.productionCents / 100).toFixed(2), (b.collectionsCents / 100).toFixed(2)]);
  return rows.map((r) => r.join(",")).join("\n");
}
