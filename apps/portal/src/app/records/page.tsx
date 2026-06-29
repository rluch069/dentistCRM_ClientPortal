import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@dentalos/ui";
import { listPrescriptions, listPlans } from "@dentalos/api";
import { formatDate, formatMoney } from "@dentalos/core";
import { getTenantContext } from "@/lib/tenant";
import { getPatientSession } from "@/lib/session";
import { AcceptPlanButton } from "@/components/accept-plan-button";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const session = await getPatientSession();
  if (!session) redirect("/login");
  const tz = ctx.tenant.timezone;

  const [prescriptions, plans] = await Promise.all([
    listPrescriptions(ctx.db, session.sub),
    listPlans(ctx.db, session.sub),
  ]);
  const sharedPlans = plans.filter((p) => p.status === "proposed" || p.status === "accepted");

  return (
    <main className="min-h-screen px-5 py-6">
      <Link href="/" className="mb-4 inline-block text-sm text-muted-foreground hover:underline">← Home</Link>
      <h1 className="mb-5 text-xl font-semibold">My records</h1>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Treatment plans</h2>
        <div className="space-y-2">
          {sharedPlans.length === 0 && <Empty>No treatment plans shared with you.</Empty>}
          {sharedPlans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {plan.title}
                  <Badge variant={plan.status === "accepted" ? "success" : "default"}>{plan.status}</Badge>
                </CardTitle>
                <span className="font-semibold">{formatMoney(plan.totalCents)}</span>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {plan.procedures.map((pr) => (
                  <div key={pr.id} className="flex justify-between border-b pb-1">
                    <span>{pr.name}{pr.toothFdi ? ` (tooth ${pr.toothFdi})` : ""}</span>
                    <span>{formatMoney(pr.feeCents)}</span>
                  </div>
                ))}
                {plan.status === "proposed" && <AcceptPlanButton planId={plan.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Prescriptions</h2>
        <div className="space-y-2">
          {prescriptions.length === 0 && <Empty>No prescriptions yet.</Empty>}
          {prescriptions.map((rx) => (
            <Card key={rx.id}>
              <CardContent className="pt-4 text-sm">
                <div className="mb-1 text-xs text-muted-foreground">{formatDate(new Date(rx.createdAt), tz)}</div>
                {rx.items.map((it, i) => (
                  <div key={i}>
                    <span className="font-medium">{it.name}</span> — {it.sig}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">{children}</p>;
}
