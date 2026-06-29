"use client";

import { ReconciliationTool } from "../../reconciliation-tool";
import type { BillingData } from "./types";

/** V1 — the original end-of-day reconciliation tool (close the day, totals by method). */
export function CloseDay({ data }: { data: BillingData }) {
  return <ReconciliationTool today={data.today} />;
}
