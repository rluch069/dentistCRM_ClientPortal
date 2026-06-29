import { redirect } from "next/navigation";
import { getChart } from "@dentalos/api";
import { getTenantContext } from "@/lib/tenant";
import { requireStaff } from "@/lib/session";
import { Odontogram } from "@/components/odontogram";

export const dynamic = "force-dynamic";

export default async function ChartPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const chart = await getChart(ctx.db, id);

  return (
    <Odontogram
      patientId={id}
      conditions={chart.conditions.map((c) => ({ id: c.id, toothFdi: c.toothFdi, conditionCode: c.conditionCode, note: c.note }))}
      procedures={chart.procedures.map((p) => ({
        id: p.id,
        toothFdi: p.toothFdi,
        code: p.code,
        name: p.name,
        surfaces: p.surfaces,
        status: p.status,
        feeCents: p.feeCents,
      }))}
    />
  );
}
