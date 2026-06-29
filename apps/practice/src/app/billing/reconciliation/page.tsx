import { redirect } from "next/navigation";
import { ymdInTz } from "@dentalos/core";
import { listPaymentsForDate, listPatients } from "@dentalos/api";
import { getTenantContext } from "@/lib/tenant";
import { requireStaff } from "@/lib/session";
import { BillingVariants } from "@/components/variants/billing";
import type { BillingData } from "@/components/variants/billing/types";

export const dynamic = "force-dynamic";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const tz = ctx.tenant.timezone;
  const today = ymdInTz(new Date(), tz);
  const sp = await searchParams;
  const initial = Math.min(Math.max(Number(sp.billing) || 0, 0), 2);

  const [payments, patientRows] = await Promise.all([
    listPaymentsForDate(ctx.db, tz, today),
    listPatients(ctx.db, { limit: 500 }),
  ]);

  const data: BillingData = {
    today,
    timezone: tz,
    payments,
    outstanding: patientRows
      .filter((p) => p.balanceCents > 0)
      .map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, phone: p.phone, balanceCents: p.balanceCents }))
      .sort((a, b) => b.balanceCents - a.balanceCents),
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-5 text-xl font-bold tracking-tight">Billing</h1>
      <BillingVariants initial={initial} data={data} />
    </div>
  );
}
