import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@dentalos/ui";
import { Stethoscope } from "lucide-react";
import { getTenantContext } from "@/lib/tenant";
import { getStaffSession } from "@/lib/session";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const ctx = await getTenantContext();
  if (ctx) {
    const session = await getStaffSession();
    if (session) redirect("/dashboard");
  }

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
      </div>
    </main>
  );
}
