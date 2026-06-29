import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Badge, Separator } from "@dentalos/ui";
import { getPatient } from "@dentalos/api";
import { formatDateTime } from "@dentalos/core";
import { getTenantContext } from "@/lib/tenant";
import { requireStaff } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PatientOverview({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const data = await getPatient(ctx.db, id);
  if (!data) notFound();
  const { patient, policies, appointments } = data;
  const tz = ctx.tenant.timezone;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Detail label="Email" value={patient.email ?? "—"} />
          <Detail label="Address" value={patient.address ?? "—"} />
          <Detail label="Allergies" value={patient.allergies ?? "None recorded"} />
          <Separator className="my-2" />
          <div>
            <div className="mb-1 text-xs uppercase text-muted-foreground">Medical history</div>
            <p className="whitespace-pre-wrap">{patient.medicalHistory ?? "None recorded"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Insurance</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {policies.length === 0 && <p className="text-muted-foreground">No insurance on file.</p>}
          {policies.map((pol) => (
            <div key={pol.id} className="rounded-lg border p-2">
              <div className="font-medium">{pol.insurerName}</div>
              <div className="text-xs text-muted-foreground">
                {pol.policyNumber ?? "no policy no."} · {pol.estimatedCoveragePct ?? 0}% est. coverage
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-base">Appointment history</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {appointments.length === 0 && <p className="text-muted-foreground">No appointments yet.</p>}
          {appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border p-2">
              <span>{formatDateTime(a.startAt, tz)}</span>
              <Badge variant="outline">{a.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
