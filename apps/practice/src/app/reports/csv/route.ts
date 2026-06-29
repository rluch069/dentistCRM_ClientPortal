import { getDailyBreakdown, reportToCsv } from "@dentalos/api";
import { ymdInTz, addDaysYmd } from "@dentalos/core";
import { getTenantContext } from "@/lib/tenant";
import { getStaffSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getStaffSession();
  const ctx = await getTenantContext();
  if (!session || !ctx) return new Response("Unauthorized", { status: 401 });

  const tz = ctx.tenant.timezone;
  const today = ymdInTz(new Date(), tz);
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? addDaysYmd(today, -29);
  const to = url.searchParams.get("to") ?? today;

  const daily = await getDailyBreakdown(ctx.db, tz, from, to);
  const csv = reportToCsv(daily);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-${from}-to-${to}.csv"`,
    },
  });
}
