import { redirect } from "next/navigation";
import { Button, Input } from "@dentalos/ui";
import { Download } from "lucide-react";
import { getReportSummary, getDailyBreakdown } from "@dentalos/api";
import { ymdInTz, addDaysYmd } from "@dentalos/core";
import { getTenantContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/session";
import { ReportsVariants } from "@/components/variants/reports";
import type { ReportsData } from "@/components/variants/reports/types";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; reports?: string }> }) {
  await requirePermission("reports:read");
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const tz = ctx.tenant.timezone;
  const today = ymdInTz(new Date(), tz);
  const sp = await searchParams;
  const rangeFrom = sp.from ?? addDaysYmd(today, -29);
  const rangeTo = sp.to ?? today;
  const initial = Math.min(Math.max(Number(sp.reports) || 0, 0), 2);

  const [summary, daily] = await Promise.all([
    getReportSummary(ctx.db, tz, rangeFrom, rangeTo),
    getDailyBreakdown(ctx.db, tz, rangeFrom, rangeTo),
  ]);
  const data: ReportsData = { summary, daily, from: rangeFrom, to: rangeTo };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Reports</h1>
        <div className="flex items-end gap-2">
          <form method="get" className="flex items-end gap-2">
            {initial > 0 && <input type="hidden" name="reports" value={String(initial)} />}
            <label className="text-sm">From<Input type="date" name="from" defaultValue={rangeFrom} className="w-40" /></label>
            <label className="text-sm">To<Input type="date" name="to" defaultValue={rangeTo} className="w-40" /></label>
            <Button type="submit" variant="outline">Apply</Button>
          </form>
          <a href={`/reports/csv?from=${rangeFrom}&to=${rangeTo}`}>
            <Button variant="outline"><Download className="h-4 w-4" /> CSV</Button>
          </a>
        </div>
      </div>

      <ReportsVariants initial={initial} data={data} />
    </div>
  );
}
