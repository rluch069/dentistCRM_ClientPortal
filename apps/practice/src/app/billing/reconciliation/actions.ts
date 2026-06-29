"use server";

import { dailyReconciliation } from "@dentalos/api";
import { getApiContext } from "@/lib/api";

export interface ReconResult {
  error?: string;
  data?: { totalsByMethod: Record<string, number>; totalCents: number };
}

export async function runReconciliationAction(businessDate: string): Promise<ReconResult> {
  try {
    const ctx = await getApiContext();
    const data = await dailyReconciliation(ctx, businessDate);
    return { data };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
