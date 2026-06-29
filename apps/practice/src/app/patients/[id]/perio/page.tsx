import { redirect } from "next/navigation";
import { getLatestPerioExam } from "@dentalos/api";
import { ymdInTz } from "@dentalos/core";
import { getTenantContext } from "@/lib/tenant";
import { requireStaff } from "@/lib/session";
import { PerioChart } from "@/components/perio-chart";

export const dynamic = "force-dynamic";

export default async function PerioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const latest = await getLatestPerioExam(ctx.db, id);
  const today = ymdInTz(new Date(), ctx.tenant.timezone);

  return (
    <PerioChart
      patientId={id}
      today={today}
      examId={latest?.exam.id ?? null}
      measures={(latest?.measures ?? []).map((m) => ({ toothFdi: m.toothFdi, site: m.site, pocketDepth: m.pocketDepth, recession: m.recession }))}
    />
  );
}
