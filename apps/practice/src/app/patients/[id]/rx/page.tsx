import { redirect } from "next/navigation";
import { listPrescriptions, listPrescriptionFavorites } from "@dentalos/api";
import { getTenantContext } from "@/lib/tenant";
import { requireStaff } from "@/lib/session";
import { RxWriter } from "@/components/rx-writer";

export const dynamic = "force-dynamic";

export default async function RxPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const [prescriptions, favorites] = await Promise.all([listPrescriptions(ctx.db, id), listPrescriptionFavorites(ctx.db)]);

  return (
    <RxWriter
      patientId={id}
      timezone={ctx.tenant.timezone}
      favorites={favorites.map((f) => ({ id: f.id, name: f.name, sig: f.sig, form: f.form }))}
      prescriptions={prescriptions.map((rx) => ({ id: rx.id, items: rx.items, note: rx.note, createdAt: rx.createdAt.toISOString() }))}
    />
  );
}
