import { redirect } from "next/navigation";
import { getAppointmentTypes, getProviders } from "@dentalos/api";
import { ymdInTz } from "@dentalos/core";
import { getTenantContext } from "@/lib/tenant";
import { getPortalToken } from "@/lib/session";
import { BookingVariants } from "@/components/variants/booking";
import type { BookingProps } from "@/components/variants/booking/types";

export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const token = await getPortalToken();
  if (!token) redirect("/login");

  const isNew = token.kind !== "patient";
  const sp = await searchParams;
  const initial = Math.min(Math.max(Number(sp.booking) || 0, 0), 2);
  const [types, providers] = await Promise.all([
    getAppointmentTypes(ctx.db, isNew ? "new" : "existing"),
    getProviders(ctx.db),
  ]);

  const data: BookingProps = {
    isNew,
    timezone: ctx.tenant.timezone,
    fromDate: ymdInTz(new Date(), ctx.tenant.timezone),
    types: types.map((t) => ({ id: t.id, name: t.name, durationMinutes: t.durationMinutes, color: t.color })),
    providers: providers.map((p) => ({ id: p.id, displayName: p.displayName })),
  };

  return (
    <main className="min-h-screen px-5 py-6">
      <h1 className="mb-5 text-xl font-bold tracking-tight">Book an appointment</h1>
      <BookingVariants initial={initial} data={data} />
    </main>
  );
}
