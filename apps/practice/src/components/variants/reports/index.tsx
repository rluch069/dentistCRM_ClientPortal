"use client";

import { useVariant } from "@dentalos/ui";
import type { ReportsData } from "./types";
import { ReportsDashboard } from "./dashboard";
import { ReportsExecutive } from "./executive";
import { ReportsDetail } from "./detail";

const LABELS = ["Dashboard", "Executive", "Detail"];

export function ReportsVariants({ initial, data }: { initial: number; data: ReportsData }) {
  const v = useVariant("reports", "Reports view", LABELS, initial);
  if (v === 1) return <ReportsExecutive data={data} />;
  if (v === 2) return <ReportsDetail data={data} />;
  return <ReportsDashboard data={data} />;
}
