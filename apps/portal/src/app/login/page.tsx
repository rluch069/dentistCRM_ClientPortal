import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, DemoPanel, demoButtonClass } from "@dentalos/ui";
import { CalendarHeart } from "lucide-react";
import { getTenantContext } from "@/lib/tenant";
import { getPatientSession } from "@/lib/session";
import { PhoneLogin } from "@/components/phone-login";
import { DEMO_PATIENTS } from "@/lib/demo-accounts";
import { demoLoginAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const ctx = await getTenantContext();
  if (ctx && (await getPatientSession())) redirect("/");
  const demoPatients = ctx ? DEMO_PATIENTS[ctx.slug] : undefined;
  const hostname = ((await headers()).get("host") ?? "").split(":")[0];

  return (
    <main className="flex min-h-screen flex-col justify-center bg-gradient-to-b from-primary/5 via-background to-background px-6">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg ring-1 ring-primary/20">
          <CalendarHeart className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{ctx ? ctx.tenant.name : "DentalOS"}</h1>
          <p className="text-sm text-muted-foreground">Book and manage your dental visits</p>
        </div>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">Sign in with your mobile</CardTitle>
        </CardHeader>
        <CardContent>
          {ctx ? (
            <PhoneLogin />
          ) : (
            <p className="text-sm text-muted-foreground">
              Open your clinic&apos;s booking link, e.g. <span className="font-mono">demo.localhost:3100</span>.
            </p>
          )}
        </CardContent>
      </Card>

      {demoPatients && (
        <DemoPanel className="mt-6" footnote="Signs in as a seeded demo patient — skips the SMS code. All data is fictional.">
          {demoPatients.map((p) => (
            <form key={p.phone} action={demoLoginAction}>
              <input type="hidden" name="phone" value={p.phone} />
              <button type="submit" className={demoButtonClass}>
                {p.name}
              </button>
            </form>
          ))}
          <a href={`${process.env.STAFF_URL ?? `http://${hostname}:3200`}/login`} className={demoButtonClass}>
            Staff app
          </a>
        </DemoPanel>
      )}
    </main>
  );
}
