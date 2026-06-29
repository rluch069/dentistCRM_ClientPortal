import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@dentalos/ui";
import { Stethoscope, ArrowRight, Building2 } from "lucide-react";
import { getTenantContext } from "@/lib/tenant";
import { openControlConnection, listTenants } from "@dentalos/tenancy";

export const dynamic = "force-dynamic";

async function getClinics() {
  try {
    const control = openControlConnection();
    try {
      const tenants = await listTenants(control.db, ["active"]);
      return tenants.map((t) => ({ slug: t.slug, name: t.name }));
    } finally {
      await control.close();
    }
  } catch {
    return [];
  }
}

export default async function Home() {
  const ctx = await getTenantContext();
  if (ctx) redirect("/dashboard");

  const clinics = await getClinics();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Stethoscope className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DentalOS</h1>
          <p className="text-sm text-muted-foreground">Practice management for Mauritius dental clinics</p>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Launch a new clinic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Spin up an isolated, cloud-ready workspace for your practice — calendar, patient records, online booking,
            reminders, and billing — in under a minute.
          </p>
          <Link href="/onboarding">
            <Button size="lg">
              Create your clinic <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {clinics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Existing clinics (dev)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {clinics.map((c) => (
              <div key={c.slug} className="flex items-center justify-between rounded-lg border p-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-muted-foreground" /> {c.name}
                </span>
                <div className="flex gap-3 text-sm">
                  <a className="text-primary hover:underline" href={`http://${c.slug}.localhost:3000`}>
                    Staff app →
                  </a>
                  <a className="text-primary hover:underline" href={`http://${c.slug}.localhost:3100`}>
                    Patient portal →
                  </a>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
