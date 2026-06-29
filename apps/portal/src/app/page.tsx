import { redirect } from "next/navigation";
import { Button, ThemeToggle } from "@dentalos/ui";
import { LogOut } from "lucide-react";
import { getPatient, listPatientAppointments } from "@dentalos/api";
import { listPatientNotifications } from "@dentalos/notifications";
import { getTenantContext } from "@/lib/tenant";
import { getPortalToken } from "@/lib/session";
import { logoutAction } from "@/app/login/actions";
import { HomeVariants } from "@/components/variants/home";
import type { HomeData } from "@/components/variants/home/types";

export const dynamic = "force-dynamic";

export default async function PortalHome({ searchParams }: { searchParams: Promise<{ home?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const token = await getPortalToken();
  if (!token) redirect("/login");
  if (token.kind !== "patient") redirect("/book");

  const tz = ctx.tenant.timezone;
  const sp = await searchParams;
  const initial = Math.min(Math.max(Number(sp.home) || 0, 0), 2);

  const [data, appts, notifications] = await Promise.all([
    getPatient(ctx.db, token.sub),
    listPatientAppointments(ctx.db, token.sub),
    listPatientNotifications(ctx.db, token.sub, 5),
  ]);
  if (!data) redirect("/login");
  const { patient } = data;
  const nextA = appts.upcoming[0];

  const home: HomeData = {
    firstName: patient.firstName,
    balanceCents: patient.balanceCents,
    timezone: tz,
    next: nextA ? { startAt: nextA.startAt, typeName: nextA.typeName, providerName: nextA.providerName } : null,
    upcoming: appts.upcoming.map((a) => ({ id: a.id, typeName: a.typeName, startAt: a.startAt, providerName: a.providerName, status: a.status })),
    past: appts.past.map((a) => ({ id: a.id, typeName: a.typeName, startAt: a.startAt, providerName: a.providerName, status: a.status })),
    notifications: notifications.map((n) => ({ id: n.id, subject: n.subject, body: n.body })),
  };

  return (
    <main className="min-h-screen px-5 py-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{ctx.tenant.name}</p>
          <h1 className="text-2xl font-bold tracking-tight">Hi {patient.firstName} 👋</h1>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <form action={logoutAction}>
            <Button variant="ghost" size="icon" aria-label="Sign out">
              <LogOut className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </header>

      <HomeVariants initial={initial} data={home} />
    </main>
  );
}
