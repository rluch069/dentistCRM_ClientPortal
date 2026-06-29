"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Badge, cn } from "@dentalos/ui";
import { addDaysYmd, dayOfWeekForYmd, APPOINTMENT_TRANSITIONS, type AppointmentStatus } from "@dentalos/core";
import type { DayAppointment } from "@dentalos/api";
import { Drawer } from "../../drawer";
import { setStatusAction } from "@/app/dashboard/actions";
import { APPT_STATUS_META } from "@/lib/status-colors";
import type { ScheduleData } from "./types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function hhmm(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}
function ymdOf(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** V4 — one dentist across a 7-day week (columns = days, since there's a single chair). */
export function WeekView({ data }: { data: ScheduleData }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [selected, setSelected] = React.useState<DayAppointment | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDaysYmd(data.weekStart, i));
  const todayYmd = ymdOf(new Date().toISOString(), data.timezone);

  const byDay = (ymd: string) =>
    data.weekAppointments.filter((a) => ymdOf(a.startAt, data.timezone) === ymd).sort((x, y) => x.startAt.localeCompare(y.startAt));

  function setStatus(id: string, s: AppointmentStatus) {
    start(async () => {
      await setStatusAction(id, s);
      setSelected(null);
      router.refresh();
    });
  }

  return (
    <div className="h-full overflow-auto p-4">
      <h2 className="mb-3 text-lg font-bold tracking-tight">Week of {data.weekStart}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((ymd) => {
          const list = byDay(ymd);
          const isToday = ymd === todayYmd;
          return (
            <div key={ymd} className={cn("rounded-xl border bg-card p-2 shadow-sm", isToday ? "border-primary ring-1 ring-primary/20" : "border-border/70")}>
              <div className="mb-2 text-center">
                <div className="text-[11px] uppercase text-muted-foreground">{DOW[dayOfWeekForYmd(ymd)]}</div>
                <div className={cn("text-sm font-bold", isToday && "text-primary")}>{ymd.slice(8)}</div>
              </div>
              <div className="space-y-1">
                {list.length === 0 && <div className="py-2 text-center text-[10px] text-muted-foreground">—</div>}
                {list.map((a) => {
                  const meta = APPT_STATUS_META[a.status];
                  const dim = a.status === "cancelled" || a.status === "no_show";
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelected(a)}
                      style={{ borderColor: meta.stripe, background: `${a.typeColor}1a` }}
                      className={cn("w-full overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left transition hover:shadow-sm", dim && "opacity-50")}
                    >
                      <div className="text-[11px] font-semibold leading-tight">{hhmm(a.startAt, data.timezone)}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{a.patientName}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <Drawer title={selected.patientName} onClose={() => setSelected(null)}>
          <div className="space-y-3 text-sm">
            <Badge variant={APPT_STATUS_META[selected.status].badge}>{APPT_STATUS_META[selected.status].label}</Badge>
            <div className="text-muted-foreground">
              {ymdOf(selected.startAt, data.timezone)} · {hhmm(selected.startAt, data.timezone)} · {selected.typeName}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {APPOINTMENT_TRANSITIONS[selected.status].map((s) => (
                <Button key={s} size="sm" variant="outline" disabled={pending} onClick={() => setStatus(selected.id, s)}>
                  {APPT_STATUS_META[s].label}
                </Button>
              ))}
              {APPOINTMENT_TRANSITIONS[selected.status].length === 0 && (
                <span className="text-xs text-muted-foreground">No further changes.</span>
              )}
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
