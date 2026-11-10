import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, DemoPanel, demoButtonClass } from "@dentalos/ui";
import { Stethoscope } from "lucide-react";
import { getTenantContext } from "@/lib/tenant";
import { getStaffSession } from "@/lib/session";
import { LoginForm } from "@/components/login-form";
import { DEMO_PASSWORD, DEMO_STAFF, PORTAL_PORT } from "@/lib/demo-accounts";
import { demoLoginAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const ctx = await getTenantContext();
  if (ctx) {
    const session = await getStaffSession();
    if (session) redirect("/dashboard");
  }
  const demoStaff = ctx ? DEMO_STAFF[ctx.slug] : undefined;
  const hostname = ((await headers()).get("host") ?? "").split(":")[0];

  return (
    <main className="relative flex min-h-screen flex-col justify-center bg-gradient-to-b from-primary/5 via-background to-background px-6">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg ring-1 ring-primary/20">
            <Stethoscope className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{ctx ? ctx.tenant.name : "DentalOS"}</h1>
            <p className="text-sm text-muted-foreground">Staff sign in</p>
          </div>
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Welcome back</CardTitle>
          </CardHeader>
          <CardContent>
            {ctx ? (
              <LoginForm />
            ) : (
              <p className="text-sm text-muted-foreground">
                Open your clinic&apos;s address to sign in, e.g. <span className="font-mono">demo.localhost:3000</span>.
              </p>
            )}
          </CardContent>
        </Card>

        {demoStaff && (
          <DemoPanel
            className="mt-6"
            footnote={
              <>
                Password for every demo account: <span className="font-mono text-foreground/80">{DEMO_PASSWORD}</span>. All data is fictional.
              </>
            }
          >
            {demoStaff.map((a) => (
              <form key={a.email} action={demoLoginAction}>
                <input type="hidden" name="email" value={a.email} />
                <button type="submit" className={demoButtonClass}>
                  {a.label}
                </button>
              </form>
            ))}
            <a href={`${process.env.PORTAL_URL ?? `http://${hostname}:${PORTAL_PORT}`}/login`} className={demoButtonClass}>
              Patient Portal
            </a>
          </DemoPanel>
        )}
      </div>
    </main>
  );
}
