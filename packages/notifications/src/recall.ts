import { and, eq, isNotNull, lte } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import { patients, practices } from "@dentalos/db/tenant";
import { createNotifications } from "./service";

/**
 * Enqueue recall_due notifications for patients whose nextRecallAt has passed.
 * Dedupes per patient per month and clears nextRecallAt so it fires only once.
 * Returns the number of patients enqueued.
 */
export async function enqueueDueRecalls(db: TenantDb, opts: { portalLink?: string } = {}): Promise<number> {
  const now = new Date();
  const due = await db
    .select()
    .from(patients)
    .where(and(isNotNull(patients.nextRecallAt), lte(patients.nextRecallAt, now)));
  if (due.length === 0) return 0;

  const practice = (await db.select().from(practices).limit(1))[0];
  const ym = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
  let count = 0;
  for (const p of due) {
    await createNotifications(db, {
      patientId: p.id,
      type: "recall_due",
      channels: ["sms", "email", "in_app"],
      locale: p.locale,
      data: { clinicName: practice?.name ?? "", patientName: p.firstName, link: opts.portalLink },
      dedupeKey: `recall:${p.id}:${ym}`,
    });
    await db.update(patients).set({ nextRecallAt: null, updatedAt: new Date() }).where(eq(patients.id, p.id));
    count++;
  }
  return count;
}
