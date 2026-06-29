import { redirect } from "next/navigation";
import { listNotes } from "@dentalos/api";
import { getTenantContext } from "@/lib/tenant";
import { requireStaff } from "@/lib/session";
import { SoapNotes } from "@/components/soap-note";

export const dynamic = "force-dynamic";

export default async function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const notes = await listNotes(ctx.db, id);

  return (
    <SoapNotes
      patientId={id}
      timezone={ctx.tenant.timezone}
      notes={notes.map((n) => ({
        id: n.id,
        subjective: n.subjective,
        objective: n.objective,
        assessment: n.assessment,
        plan: n.plan,
        signedAt: n.signedAt ? n.signedAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      }))}
    />
  );
}
