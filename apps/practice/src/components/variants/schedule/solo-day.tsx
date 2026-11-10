"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Badge, Avatar, Card, CardHeader, CardTitle, CardContent, cn } from "@dentalos/ui";
import { type AppointmentStatus, addDaysYmd, dayOfWeekForYmd, ymdInTz } from "@dentalos/core";
import type { DayAppointment } from "@dentalos/api";
import { Plus, Clock } from "lucide-react";
import { NewAppointmentDialog } from "../../schedule-board";
import { AppointmentPopover } from "../../appointment-popover";
import { setStatusAction } from "@/app/dashboard/actions";
import { APPT_STATUS_META } from "@/lib/status-colors";
import type { ScheduleData } from "./types";

const DAY_START = 480; // 08:00
const DAY_END = 1080; // 18:00
const PX = 2.2;
const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function lmin(iso: string, tz: string): number {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  return Number(p.find((x) => x.type === "hour")?.value ?? 0) * 60 + Number(p.find((x) => x.type === "minute")?.value ?? 0);
}
function fmt12(m: number): string {
  const h24 = Math.floor(m / 60) % 24;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m % 60).padStart(2, "0")} ${period}`;
}

/** V2 — a single vertical time-rail for one chair/dentist (the typical Mauritius solo practice). */
export function SoloDay({ data }: { data: ScheduleData }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<DayAppointment | null>(null);
  const [anchor, setAnchor] = React.useState<DOMRect | null>(null);
  const [dialog, setDialog] = React.useState<{ operatoryId: string; startMinute: number } | null>(null);
  const [pending, start] = React.useTransition();
  const [nowMin, setNowMin] = React.useState<number>(() => (data.isToday ? lmin(new Date().toISOString(), data.timezone) : -1));

  React.useEffect(() => {
    if (!data.isToday) return;
    const t = setInterval(() => setNowMin(lmin(new Date().toISOString(), data.timezone)), 60_000);
    return () => clearInterval(t);
  }, [data.isToday, data.timezone]);

  const appts = [...data.appointments].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const ticks: number[] = [];
  for (let m = DAY_START; m <= DAY_END; m += 30) ticks.push(m);
  const hours: number[] = [];
  for (let m = DAY_START; m < DAY_END; m += 60) hours.push(m);
  const height = (DAY_END - DAY_START) * PX;
  const GRID_PAD = 12; // px-value of the grid's `py-3`; keep in sync when tweaking that class.

  function setStatus(id: string, s: AppointmentStatus) {
    start(async () => {
      await setStatusAction(id, s);
      setSelected(null);
      setAnchor(null);
      router.refresh();
    });
  }

  function select(a: DayAppointment, el: HTMLElement) {
    setAnchor(el.getBoundingClientRect());
    setSelected(a);
  }

  function openAt(clientY: number, top: number) {
    const rawMin = DAY_START + (clientY - top - GRID_PAD) / PX;
    const snapped = Math.round(rawMin / 15) * 15;
    const clamped = Math.min(Math.max(snapped, DAY_START), DAY_END - 15);
    setDialog({ operatoryId: data.operatories[0]?.id ?? "", startMinute: clamped });
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-auto bg-secondary/40 p-4 lg:grid-cols-[1fr_320px] lg:overflow-hidden">
      <Card className="flex w-full flex-col overflow-auto px-6 py-5 lg:h-full">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">{data.providers[0]?.displayName ?? "Schedule"}</h2>
          <Button size="sm" className="rounded-full" onClick={() => setDialog({ operatoryId: data.operatories[0]?.id ?? "", startMinute: 540 })}>
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>

        <div
          className="relative w-full cursor-crosshair rounded-xl border border-border/70 bg-card py-3"
          style={{ height }}
          onClick={(ev) => openAt(ev.clientY, ev.currentTarget.getBoundingClientRect().top)}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 border-r border-border/60" />
          {hours.map(
            (m, i) =>
              i % 2 === 0 && (
                <div
                  key={`band-${m}`}
                  className="pointer-events-none absolute left-16 right-0 bg-muted/40"
                  style={{ top: (m - DAY_START) * PX, height: 60 * PX }}
                />
              ),
          )}
          {ticks.map((m) => {
            const isHour = m % 60 === 0;
            return (
              <div
                key={`tick-${m}`}
                className={cn("pointer-events-none absolute left-16 right-0 border-t", isHour ? "border-border/70" : "border-dashed border-border/40")}
                style={{ top: (m - DAY_START) * PX }}
              />
            );
          })}
          {ticks
            .filter((m) => m % 60 === 0)
            .map((m) => (
              <span
                key={`label-${m}`}
                className="pointer-events-none absolute left-0 w-16 -translate-y-1/2 whitespace-nowrap pr-2 text-right text-[11px] font-medium text-foreground/70"
                style={{ top: (m - DAY_START) * PX }}
              >
                {fmt12(m)}
              </span>
            ))}
          {appts.map((a) => {
            const s = lmin(a.startAt, data.timezone);
            const e = lmin(a.endAt, data.timezone);
            const top = (s - DAY_START) * PX;
            const h = Math.max((e - s) * PX, 52);
            const meta = APPT_STATUS_META[a.status];
            const dim = a.status === "cancelled" || a.status === "no_show";
            const roomy = e - s >= 30;
            return (
              <button
                key={a.id}
                onClick={(ev) => {
                  ev.stopPropagation();
                  select(a, ev.currentTarget);
                }}
                style={{ top, height: h, borderColor: meta.stripe, background: `${a.typeColor}30` }}
                className={cn(
                  "absolute left-16 right-3 cursor-pointer overflow-hidden rounded-xl border-l-4 px-3 py-1.5 text-left shadow-sm transition hover:-translate-y-px hover:shadow-md",
                  dim && "opacity-50",
                )}
              >
                <div className="flex items-center gap-2">
                  <Avatar name={a.patientName} className="h-7 w-7 shrink-0 text-xs" />
                  <span className="truncate text-sm font-semibold leading-tight">{a.patientName}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {fmt12(s)}–{fmt12(e)} · {a.typeName}
                </div>
                {roomy && (
                  <Badge variant={meta.badge} className="mt-1 px-1.5 py-0 text-[10px]">
                    {meta.label}
                  </Badge>
                )}
              </button>
            );
          })}
          {data.isToday && nowMin >= DAY_START && nowMin <= DAY_END && (
            <div
              className="pointer-events-none absolute left-16 right-0 z-10 flex items-center"
              style={{ top: (nowMin - DAY_START) * PX }}
            >
              <div className="-ml-1 h-2 w-2 shrink-0 rounded-full bg-destructive" />
              <div className="h-px flex-1 bg-destructive" />
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-col gap-4 overflow-auto">
        <MiniCalendar activeDate={data.date} timezone={data.timezone} />
        <TodayList appointments={appts} timezone={data.timezone} isToday={data.isToday} onSelect={select} />
      </div>

      {selected && anchor && (
        <AppointmentPopover
          appointment={selected}
          anchorRect={anchor}
          timezone={data.timezone}
          pending={pending}
          onStatusChange={setStatus}
          onClose={() => {
            setSelected(null);
            setAnchor(null);
          }}
        />
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

function MiniCalendar({ activeDate, timezone }: { activeDate: string; timezone: string }) {
  const todayYmd = ymdInTz(new Date(), timezone);
  const firstOfMonth = `${activeDate.slice(0, 7)}-01`;
  const dow = dayOfWeekForYmd(firstOfMonth); // 0=Sun..6=Sat
  const gridStart = addDaysYmd(firstOfMonth, dow === 0 ? -6 : 1 - dow); // Monday-start
  const cells = Array.from({ length: 42 }, (_, i) => addDaysYmd(gridStart, i));
  const monthLabel = new Date(`${activeDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 text-sm font-bold tracking-tight">{monthLabel}</div>
        <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
          {DOW_LABELS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
          {cells.map((ymd) => {
            const inMonth = ymd.slice(0, 7) === activeDate.slice(0, 7);
            const isViewed = ymd === activeDate;
            const isToday = ymd === todayYmd;
            return (
              <Link key={ymd} href={`/dashboard?date=${ymd}&schedule=1`} className="flex items-center justify-center py-0.5">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                    !inMonth && "text-muted-foreground/40",
                    inMonth && !isViewed && "hover:bg-secondary",
                    isViewed && "bg-primary font-semibold text-primary-foreground",
                    !isViewed && isToday && "font-semibold text-primary ring-1 ring-primary/40",
                  )}
                >
                  {Number(ymd.slice(8))}
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TodayList({
  appointments,
  timezone,
  isToday,
  onSelect,
}: {
  appointments: DayAppointment[];
  timezone: string;
  isToday: boolean;
  onSelect: (a: DayAppointment, el: HTMLElement) => void;
}) {
  const [showAll, setShowAll] = React.useState(false);
  const visible = showAll ? appointments : appointments.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{isToday ? "Today's appointments" : "Appointments"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {appointments.length === 0 && <p className="text-sm text-muted-foreground">No appointments.</p>}
        {visible.map((a) => {
          const s = lmin(a.startAt, timezone);
          const e = lmin(a.endAt, timezone);
          return (
            <button
              key={a.id}
              onClick={(ev) => onSelect(a, ev.currentTarget)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/70 p-2.5 text-left transition-colors hover:bg-secondary/40"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={a.patientName} className="h-8 w-8 shrink-0 text-xs" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.patientName}</div>
                  <div className="truncate text-xs text-muted-foreground">{a.typeName}</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {fmt12(s)}–{fmt12(e)}
              </div>
            </button>
          );
        })}
        {appointments.length > 5 && (
          <Button variant="outline" size="sm" className="w-full rounded-full" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show less" : "See all"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
