import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, Badge } from "@dentalos/ui";
import { getPatient, listInvoices } from "@dentalos/api";
import { formatMoney, formatDate } from "@dentalos/core";
import { getTenantContext } from "@/lib/tenant";
import { getPatientSession } from "@/lib/session";
import { PayPanel } from "@/components/pay-panel";

export const dynamic = "force-dynamic";

export default async function PayPage() {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const session = await getPatientSession();
  if (!session) redirect("/login");
  const tz = ctx.tenant.timezone;

  const [data, invoices] = await Promise.all([getPatient(ctx.db, session.sub), listInvoices(ctx.db, session.sub)]);
  const balance = data?.patient.balanceCents ?? 0;
  const issued = invoices.filter((i) => i.number);

  return (
    <main className="min-h-screen px-5 py-6">
      <Link href="/" className="mb-4 inline-block text-sm text-muted-foreground hover:underline">← Home</Link>
      <h1 className="mb-5 text-xl font-semibold">Payments</h1>
      <PayPanel balanceCents={balance} />

      {issued.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Invoices</h2>
          <div className="space-y-2">
            {issued.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium">Invoice #{inv.number}</div>
                    <div className="text-xs text-muted-foreground">{inv.issuedAt ? formatDate(inv.issuedAt, tz) : ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{formatMoney(inv.totalCents)}</span>
                    <Badge variant={inv.status === "paid" ? "success" : "warning"}>{inv.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
