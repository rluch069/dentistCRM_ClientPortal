import Link from "next/link";
import { redirect } from "next/navigation";
import { getPatient, getLatestConsents } from "@dentalos/api";
import { getTenantContext } from "@/lib/tenant";
import { getPatientSession } from "@/lib/session";
import { IntakeForm } from "@/components/intake-form";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const session = await getPatientSession();
  if (!session) redirect("/login");

  const [data, consents] = await Promise.all([getPatient(ctx.db, session.sub), getLatestConsents(ctx.db, session.sub)]);

  return (
    <main className="min-h-screen px-5 py-6">
      <Link href="/" className="mb-4 inline-block text-sm text-muted-foreground hover:underline">← Home</Link>
      <h1 className="mb-1 text-xl font-semibold">Medical history & consent</h1>
      <p className="mb-5 text-sm text-muted-foreground">This helps your dentist treat you safely. You can update it any time.</p>
      <IntakeForm
        defaults={{ medicalHistory: data?.patient.medicalHistory ?? "", allergies: data?.patient.allergies ?? "" }}
        consents={consents}
      />
    </main>
  );
}
