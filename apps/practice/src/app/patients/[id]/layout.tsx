import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@dentalos/ui";
import { getPatient } from "@dentalos/api";
import { formatMoney } from "@dentalos/core";
import { getTenantContext } from "@/lib/tenant";
import { requireStaff } from "@/lib/session";
import { PatientTabs } from "@/components/patient-tabs";

export const dynamic = "force-dynamic";

export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const data = await getPatient(ctx.db, id);
  if (!data) notFound();
  const { patient } = data;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link href="/patients" className="mb-4 inline-block text-sm text-muted-foreground hover:underline">
        ← Patients
      </Link>
      <div className="mb-4 flex items-center gap-4">
        <Avatar name={`${patient.firstName} ${patient.lastName}`} className="h-14 w-14 text-lg" />
        <div>
          <h1 className="text-2xl font-semibold">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {patient.dateOfBirth ? `DOB ${patient.dateOfBirth}` : "DOB unknown"} · {patient.phone ?? "no phone"} ·{" "}
            {patient.locale === "fr" ? "Français" : "English"}
          </p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs uppercase text-muted-foreground">Balance</div>
          <div className={patient.balanceCents > 0 ? "font-semibold text-warning-foreground" : "font-semibold"}>
            {formatMoney(patient.balanceCents)}
          </div>
        </div>
      </div>
      <PatientTabs patientId={id} />
      <div className="mt-5">{children}</div>
    </div>
  );
}
