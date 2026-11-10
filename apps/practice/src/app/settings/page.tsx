import { redirect } from "next/navigation";
import { listAppointmentTypesAll } from "@dentalos/api";
import { getTenantContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/session";
import { AppointmentTypesManager } from "@/components/appointment-types-manager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requirePermission("settings:write");
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");

  const types = await listAppointmentTypesAll(ctx.db);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-bold tracking-tight">Settings</h1>
      <p className="mb-5 text-sm text-muted-foreground">Manage the appointment types your clinic offers.</p>
      <AppointmentTypesManager
        types={types.map((t) => ({
          id: t.id,
          name: t.name,
          durationMinutes: t.durationMinutes,
          scope: t.scope,
          color: t.color,
          isActive: t.isActive,
        }))}
      />
    </div>
  );
}
