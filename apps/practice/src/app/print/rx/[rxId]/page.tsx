import { notFound, redirect } from "next/navigation";
import { getPrescription, getPatient, getPractice } from "@dentalos/api";
import { formatDate } from "@dentalos/core";
import { getTenantContext } from "@/lib/tenant";
import { requireStaff } from "@/lib/session";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function PrintRxPage({ params }: { params: Promise<{ rxId: string }> }) {
  await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const { rxId } = await params;
  const rx = await getPrescription(ctx.db, rxId);
  if (!rx) notFound();
  const [patientData, practice] = await Promise.all([getPatient(ctx.db, rx.patientId), getPractice(ctx.db)]);
  const patient = patientData?.patient;
  const tz = ctx.tenant.timezone;

  return (
    <div className="mx-auto max-w-2xl p-10 text-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{practice?.name ?? ctx.tenant.name}</h1>
          {practice?.address && <p className="text-muted-foreground">{practice.address}</p>}
          {practice?.phone && <p className="text-muted-foreground">{practice.phone}</p>}
        </div>
        <PrintButton />
      </div>

      <div className="mb-6 border-y py-3">
        <div className="flex justify-between">
          <span><strong>Patient:</strong> {patient ? `${patient.firstName} ${patient.lastName}` : "—"}</span>
          <span><strong>Date:</strong> {formatDate(new Date(rx.createdAt), tz)}</span>
        </div>
        {patient?.dateOfBirth && <div><strong>DOB:</strong> {patient.dateOfBirth}</div>}
      </div>

      <div className="mb-8">
        <div className="mb-3 text-2xl font-serif">℞</div>
        <ol className="space-y-3">
          {rx.items.map((it, i) => (
            <li key={i} className="border-b pb-2">
              <div className="font-semibold">{i + 1}. {it.name}{it.quantity ? ` — ${it.quantity}` : ""}</div>
              <div className="text-muted-foreground">Sig: {it.sig}</div>
            </li>
          ))}
        </ol>
        {rx.note && <p className="mt-4 text-muted-foreground">Note: {rx.note}</p>}
      </div>

      <div className="mt-16 flex justify-end">
        <div className="w-64 border-t pt-2 text-center text-muted-foreground">Signature</div>
      </div>
    </div>
  );
}
