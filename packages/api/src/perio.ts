import { and, desc, eq } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import { perioExams, perioMeasures } from "@dentalos/db/tenant";
import type { ApiContext } from "./context";
import { writeAudit } from "./audit";

export const PERIO_SITES = ["MB", "B", "DB", "ML", "L", "DL"] as const;
export type PerioSite = (typeof PERIO_SITES)[number];

export interface PerioMeasureInput {
  toothFdi: number;
  site: string;
  pocketDepth?: number;
  recession?: number;
  bleeding?: boolean;
  suppuration?: boolean;
}

export async function createPerioExam(ctx: ApiContext, input: { patientId: string; examDate: string }): Promise<string> {
  const examinedByStaffId = ctx.actor.kind === "staff" ? ctx.actor.staffUserId : null;
  const [row] = await ctx.db
    .insert(perioExams)
    .values({ patientId: input.patientId, examDate: input.examDate, examinedByStaffId })
    .returning({ id: perioExams.id });
  await writeAudit(ctx.db, ctx.actor, "perio.exam.create", "patient", input.patientId, { examId: row!.id });
  return row!.id;
}

/** Replace all measures for an exam (idempotent save). */
export async function savePerioMeasures(ctx: ApiContext, examId: string, measures: PerioMeasureInput[]): Promise<void> {
  await ctx.db.delete(perioMeasures).where(eq(perioMeasures.examId, examId));
  const rows = measures.filter((m) => m.pocketDepth != null || m.recession != null || m.bleeding || m.suppuration);
  if (rows.length > 0) {
    await ctx.db.insert(perioMeasures).values(
      rows.map((m) => ({
        examId,
        toothFdi: m.toothFdi,
        site: m.site,
        pocketDepth: m.pocketDepth ?? null,
        recession: m.recession ?? null,
        bleeding: m.bleeding ?? false,
        suppuration: m.suppuration ?? false,
      })),
    );
  }
  await writeAudit(ctx.db, ctx.actor, "perio.exam.save", "perio_exam", examId, { sites: rows.length });
}

export interface PerioSummary {
  sitesProbed: number;
  deepSites: number; // PD >= 4mm
  bleedingSites: number;
  meanCalMm: number;
}

export function summarizePerio(measures: { pocketDepth: number | null; recession: number | null; bleeding: boolean }[]): PerioSummary {
  let sitesProbed = 0;
  let deep = 0;
  let bleeding = 0;
  let calSum = 0;
  let calCount = 0;
  for (const m of measures) {
    if (m.pocketDepth != null) {
      sitesProbed++;
      if (m.pocketDepth >= 4) deep++;
      const cal = m.pocketDepth + (m.recession ?? 0);
      calSum += cal;
      calCount++;
    }
    if (m.bleeding) bleeding++;
  }
  return { sitesProbed, deepSites: deep, bleedingSites: bleeding, meanCalMm: calCount ? calSum / calCount : 0 };
}

export async function getLatestPerioExam(db: TenantDb, patientId: string) {
  const exam = (await db.select().from(perioExams).where(eq(perioExams.patientId, patientId)).orderBy(desc(perioExams.examDate), desc(perioExams.createdAt)).limit(1))[0];
  if (!exam) return null;
  const measures = await db.select().from(perioMeasures).where(eq(perioMeasures.examId, exam.id));
  return { exam, measures, summary: summarizePerio(measures) };
}

export async function listPerioExams(db: TenantDb, patientId: string) {
  return db.select().from(perioExams).where(eq(perioExams.patientId, patientId)).orderBy(desc(perioExams.examDate));
}
