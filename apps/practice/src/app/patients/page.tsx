import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Input } from "@dentalos/ui";
import { UserPlus, Search } from "lucide-react";
import { listPatients } from "@dentalos/api";
import { getTenantContext } from "@/lib/tenant";
import { requireStaff } from "@/lib/session";
import { PatientsVariants } from "@/components/variants/patients";
import type { PatientsData } from "@/components/variants/patients/types";

export const dynamic = "force-dynamic";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string; patients?: string }> }) {
  await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const sp = await searchParams;
  const rows = await listPatients(ctx.db, { search: sp.q, limit: 200 });
  const initial = Math.min(Math.max(Number(sp.patients) || 0, 0), 2);

  const data: PatientsData = {
    timezone: ctx.tenant.timezone,
    patients: rows.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      email: p.email,
      locale: p.locale,
      balanceCents: p.balanceCents,
      lastVisitAt: p.lastVisitAt ? p.lastVisitAt.toISOString() : null,
      nextRecallAt: p.nextRecallAt ? p.nextRecallAt.toISOString() : null,
    })),
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Patients</h1>
        <Link href="/patients/new">
          <Button>
            <UserPlus className="h-4 w-4" /> New patient
          </Button>
        </Link>
      </div>

      <form className="mb-4 flex gap-2" action="/patients">
        {initial > 0 && <input type="hidden" name="patients" value={String(initial)} />}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={sp.q} placeholder="Search by name or phone…" className="pl-9" />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <PatientsVariants initial={initial} data={data} />
    </div>
  );
}
