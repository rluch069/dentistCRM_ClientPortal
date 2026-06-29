"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Badge, cn } from "@dentalos/ui";
import { APPOINTMENT_TRANSITIONS, type AppointmentStatus } from "@dentalos/core";
import type { DayAppointment } from "@dentalos/api";
import { Plus } from "lucide-react";
import { Drawer } from "../../drawer";
import { NewAppointmentDialog } from "../../schedule-board";
import { setStatusAction } from "@/app/dashboard/actions";
import { APPT_STATUS_META } from "@/lib/status-colors";
import type { ScheduleData } from "./types";

const DAY_START = 480; // 08:00
const DAY_END = 1080; // 18:00
const PX = 1.5;

function lmin(iso: string, tz: string): number {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  return Number(p.find((x) => x.type === "hour")?.value ?? 0) * 60 + Number(p.find((x) => x.type === "minute")?.value ?? 0);
}
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** V2 — a single vertical time-rail for one chair/dentist (the typical Mauritius solo practice). */
export function SoloDay({ data }: { data: ScheduleData }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<DayAppointment | null>(null);
  const [dialog, setDialog] = React.useState<{ operatoryId: string; startMinute: number } | null>(null);
  const [pending, start] = React.useTransition();
  const [nowMin, setNowMin] = React.useState<number>(() => (data.isToday ? lmin(new Date().toISOString(), data.timezone) : -1));

  React.useEffect(() => {
    if (!data.isToday) return;
    const t = setInterval(() => setNowMin(lmin(new Date().toISOString(), data.timezone)), 60_000);
    return () => clearInterval(t);
  }, [data.isToday, data.timezone]);

  const appts = [...data.appointments].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const hours: number[] = [];
  for (let m = DAY_START; m <= DAY_END; m += 60) hours.push(m);
  const height = (DAY_END - DAY_START) * PX;

  function setStatus(id: string, s: AppointmentStatus) {
    start(async () => {
      await setStatusAction(id, s);
      setSelected(null);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto h-full max-w-3xl overflow-auto px-4 py-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{data.providers[0]?.displayName ?? "Schedule"}</h2>
          <p className="text-sm text-muted-foreground">
            {appts.length} appointment{appts.length === 1 ? "" : "s"} · {data.actionPanel.stats.remaining} remaining
          </p>
        </div>
        <Button size="sm" onClick={() => setDialog({ operatoryId: data.operatories[0]?.id ?? "", startMinute: 540 })}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      {appts.length === 0 && (
        <p className="mb-4 rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
          No appointments scheduled for this day.
        </p>
      )}

      <div className="relative rounded-xl border border-border/70 bg-card p-2 shadow-sm" style={{ height }}>
        {hours.map((m) => (
          <div key={m} className="absolute inset-x-0 border-t border-dashed border-border/50" style={{ top: (m - DAY_START) * PX }}>
            <span className="absolute -top-2 left-1 text-[11px] text-muted-foreground">{hhmm(m)}</span>
          </div>
        ))}
        {appts.map((a) => {
          const s = lmin(a.startAt, data.timezone);
          const e = lmin(a.endAt, data.timezone);
          const top = (s - DAY_START) * PX;
          const h = Math.max((e - s) * PX, 30);
          const meta = APPT_STATUS_META[a.status];
          const dim = a.status === "cancelled" || a.status === "no_show";
          return (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              style={{ top, height: h, borderColor: meta.stripe, background: `${a.typeColor}1a` }}
              className={cn(
                "absolute left-14 right-2 overflow-hidden rounded-lg border-l-4 px-3 py-1.5 text-left shadow-sm transition hover:-translate-y-px hover:shadow-md",
                dim && "opacity-50",
              )}
            >
              <div className="text-sm font-semibold leading-tight">
                {hhmm(s)} · {a.patientName}
              </div>
              <div className="truncate text-xs text-muted-foreground">{a.typeName}</div>
            </button>
          );
        })}
        {data.isToday && nowMin >= DAY_START && nowMin <= DAY_END && (
          <div className="pointer-events-none absolute right-0 z-10 flex items-center" style={{ left: 8, top: (nowMin - DAY_START) * PX }}>
            <div className="h-2 w-2 rounded-full bg-destructive" />
            <div className="h-px flex-1 bg-destructive" />
          </div>
        )}
      </div>

      {selected && (
        <Drawer title={selected.patientName} onClose={() => setSelected(null)}>
          <div className="space-y-3 text-sm">
            <Badge variant={APPT_STATUS_META[selected.status].badge}>{APPT_STATUS_META[selected.status].label}</Badge>
            <div className="text-muted-foreground">
              {hhmm(lmin(selected.startAt, data.timezone))}–{hhmm(lmin(selected.endAt, data.timezone))} · {selected.typeName}
            </div>
            <div className="pt-2">
              <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Update status</div>
              <div className="flex flex-wrap gap-2">
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
          </div>
        </Drawer>
      )}

      {dialog && (
        <NewAppointmentDialog
          date={data.date}
          timezone={data.timezone}
          isToday={data.isToday}
          operatories={data.operatories}
          providers={data.providers}
          appointmentTypes={data.appointmentTypes}
          patients={data.patients}
          appointments={data.appointments}
          prefill={dialog}
          onClose={() => setDialog(null)}
          onCreated={() => {
            setDialog(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
