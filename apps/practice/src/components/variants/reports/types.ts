import type { ReportSummary, DailyBucket } from "@dentalos/api";

export interface ReportsData {
  summary: ReportSummary;
  daily: DailyBucket[];
  from: string;
  to: string;
}
