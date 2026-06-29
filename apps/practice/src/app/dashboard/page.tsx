import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@dentalos/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCockpit, listPatients, getAppointmentTypes, getAppointmentsInRange } from "@dentalos/api";
import { ymdInTz, addDaysYmd, formatDate, dayOfWeekForYmd } from "@dentalos/core";
import { getTenantContext } from "@/lib/tenant";
import { ScheduleVariants } from "@/components/variants/schedule";
import type { ScheduleData } from "@/components/variants/schedule/types";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ date?: string; schedule?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const tz = ctx.tenant.timezone;
  const todayYmd = ymdInTz(new Date(), tz);
  const sp = await searchParams;
  const activeDate = sp.date ?? todayYmd;
  const initial = Math.min(Math.max(Number(sp.schedule) || 0, 0), 3);

  const dow = dayOfWeekForYmd(activeDate);
  const weekStart = addDaysYmd(activeDate, dow === 0 ? -6 : 1 - dow);
  const weekEnd = addDaysYmd(weekStart, 6);

  const [cockpit, patientRows, types, weekAppointments] = await Promise.all([
    getCockpit(ctx.db, tz, activeDate),
    listPatients(ctx.db, { limit: 300 }),
    getAppointmentTypes(ctx.db),
    getAppointmentsInRange(ctx.db, tz, weekStart, weekEnd),
  ]);

  const data: ScheduleData = {
    date: activeDate,
    timezone: tz,
    isToday: activeDate === todayYmd,
    operatories: cockpit.operatories.map((o) => ({ id: o.id, name: o.name, color: o.color })),
    providers: cockpit.providers.map((p) => ({ id: p.id, displayName: p.displayName, color: p.color })),
    appointmentTypes: types.map((t) => ({ id: t.id, name: t.name, durationMinutes: t.durationMinutes, color: t.color })),
    patients: patientRows.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}` })),
    appointments: cockpit.appointments,
    weekStart,
    weekAppointments,
    actionPanel: cockpit.actionPanel,
    waitlist: cockpit.waitlist,
  };

  const prev = addDaysYmd(activeDate, -1);
  const next = addDaysYmd(activeDate, 1);
  const weekday = WEEKDAYS[dayOfWeekForYmd(activeDate)];
  const sched = `&schedule=${initial}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 bg-card/60 px-6 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-bold tracking-tight">{weekday}</h1>
          <span className="text-sm text-muted-foreground">{formatDate(new Date(`${activeDate}T12:00:00Z`), tz)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard?date=${prev}${sched}`}>
            <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <Link href={`/dashboard?date=${todayYmd}${sched}`}>
            <Button variant="outline" size="sm">Today</Button>
          </Link>
          <Link href={`/dashboard?date=${next}${sched}`}>
            <Button variant="outline" size="icon"><ChevronRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScheduleVariants initial={initial} data={data} />
      </div>
    </div>
  );
}
