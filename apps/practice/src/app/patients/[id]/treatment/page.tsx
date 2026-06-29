import { redirect } from "next/navigation";
import { listPlans } from "@dentalos/api";
import { getTenantContext } from "@/lib/tenant";
import { requireStaff } from "@/lib/session";
import { TreatmentPlans } from "@/components/treatment-plan";

export const dynamic = "force-dynamic";

export default async function TreatmentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const plans = await listPlans(ctx.db, id);

  return (
    <TreatmentPlans
      patientId={id}
      plans={plans.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        totalCents: p.totalCents,
        procedures: p.procedures.map((pr) => ({ id: pr.id, code: pr.code, name: pr.name, toothFdi: pr.toothFdi, feeCents: pr.feeCents, status: pr.status })),
      }))}
    />
  );
}
