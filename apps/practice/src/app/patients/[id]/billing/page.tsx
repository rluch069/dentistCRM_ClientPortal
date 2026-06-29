import { notFound, redirect } from "next/navigation";
import { getPatient, getLedger, listInvoices, getChart } from "@dentalos/api";
import { getTenantContext } from "@/lib/tenant";
import { requireStaff } from "@/lib/session";
import { BillingPanel } from "@/components/billing-panel";

export const dynamic = "force-dynamic";

export default async function BillingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const [data, ledger, invoices, chart] = await Promise.all([
    getPatient(ctx.db, id),
    getLedger(ctx.db, id),
    listInvoices(ctx.db, id),
    getChart(ctx.db, id),
  ]);
  if (!data) notFound();

  return (
    <BillingPanel
      patientId={id}
      timezone={ctx.tenant.timezone}
      balanceCents={data.patient.balanceCents}
      ledger={ledger.map((l) => ({ id: l.id, type: l.type, amountCents: l.amountCents, description: l.description, createdAt: l.createdAt.toISOString() }))}
      invoices={invoices.map((i) => ({ id: i.id, number: i.number, status: i.status, totalCents: i.totalCents, paidCents: i.paidCents }))}
      completedProcedures={chart.procedures
        .filter((p) => p.status === "completed")
        .map((p) => ({ id: p.id, name: p.name, toothFdi: p.toothFdi, feeCents: p.feeCents }))}
    />
  );
}
