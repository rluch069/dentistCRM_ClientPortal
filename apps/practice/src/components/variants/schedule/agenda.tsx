"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Badge, Avatar } from "@dentalos/ui";
import { APPOINTMENT_TRANSITIONS, type AppointmentStatus } from "@dentalos/core";
import type { DayAppointment } from "@dentalos/api";
import { Plus } from "lucide-react";
import { NewAppointmentDialog } from "../../schedule-board";
import { setStatusAction } from "@/app/dashboard/actions";
import { APPT_STATUS_META } from "@/lib/status-colors";
import type { ScheduleData } from "./types";

function hhmm(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

/** V3 — a clean chronological card list of the day's visits with inline status actions. */
export function Agenda({ data }: { data: ScheduleData }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [dialog, setDialog] = React.useState<{ operatoryId: string; startMinute: number } | null>(null);
  const appts = [...data.appointments].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const next = (s: AppointmentStatus): AppointmentStatus | undefined => APPOINTMENT_TRANSITIONS[s][0];

  function advance(a: DayAppointment) {
    const n = next(a.status);
    if (!n) return;
    start(async () => {
      await setStatusAction(a.id, n);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto h-full max-w-2xl overflow-auto px-4 py-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Today&apos;s agenda</h2>
          <p className="text-sm text-muted-foreground">
            {appts.length} appointment{appts.length === 1 ? "" : "s"} · {data.actionPanel.stats.completed} done
          </p>
        </div>
        <Button size="sm" onClick={() => setDialog({ operatoryId: data.operatories[0]?.id ?? "", startMinute: 540 })}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      {appts.length === 0 && (
        <p className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">Nothing booked today.</p>
      )}

      <ol className="space-y-2">
        {appts.map((a) => {
          const meta = APPT_STATUS_META[a.status];
          const n = next(a.status);
          const dim = a.status === "cancelled" || a.status === "no_show";
          return (
            <li
              key={a.id}
              className={cnRow(dim)}
            >
              <div className="w-14 shrink-0 text-center">
                <div className="text-sm font-bold">{hhmm(a.startAt, data.timezone)}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{hhmm(a.endAt, data.timezone)}</div>
              </div>
              <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: meta.stripe }} />
              <Avatar name={a.patientName} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{a.patientName}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {a.typeName} · {a.providerName}
                </div>
              </div>
              <Badge variant={meta.badge}>{meta.label}</Badge>
              {n && (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => advance(a)}>
                  {APPT_STATUS_META[n].label}
                </Button>
              )}
            </li>
          );
        })}
      </ol>

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

function cnRow(dim: boolean): string {
  return `flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-sm${dim ? " opacity-50" : ""}`;
}
