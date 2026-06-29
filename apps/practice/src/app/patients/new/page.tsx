import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@dentalos/ui";
import { getTenantContext } from "@/lib/tenant";
import { requireStaff } from "@/lib/session";
import { NewPatientForm } from "@/components/new-patient-form";

export const dynamic = "force-dynamic";

export default async function NewPatientPage() {
  await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link href="/patients" className="mb-4 inline-block text-sm text-muted-foreground hover:underline">
        ← Patients
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>New patient</CardTitle>
        </CardHeader>
        <CardContent>
          <NewPatientForm />
        </CardContent>
      </Card>
    </div>
  );
}
