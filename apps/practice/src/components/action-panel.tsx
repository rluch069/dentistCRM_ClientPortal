"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Avatar } from "@dentalos/ui";
import type { ActionPanel as ActionPanelData, DayAppointment, WaitlistItem } from "@dentalos/api";
import { CalendarClock, BellRing, DoorOpen, CheckCheck, Zap, MessageSquare } from "lucide-react";
import { setStatusAction, notifyWaitlistAction } from "@/app/dashboard/actions";
import type { AppointmentStatus } from "@dentalos/core";

function localTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

export function ActionPanel({ data, waitlist, timezone }: { data: ActionPanelData; waitlist: WaitlistItem[]; timezone: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const act = (id: string, status: AppointmentStatus) =>
    startTransition(async () => {
      await setStatusAction(id, status);
      router.refresh();
    });
  const notify = (entryId: string) =>
    startTransition(async () => {
      await notifyWaitlistAction(entryId);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Booked" value={data.stats.total} />
        <Stat label="Remaining" value={data.stats.remaining} />
        <Stat label="Done" value={data.stats.completed} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-primary" /> Next patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.nextUp ? (
            <div className="flex items-center gap-3">
              <Avatar name={data.nextUp.patientName} />
              <div className="min-w-0">
                <div className="truncate font-medium">{data.nextUp.patientName}</div>
                <div className="text-xs text-muted-foreground">
                  {localTime(data.nextUp.startAt, timezone)} · {data.nextUp.typeName}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing upcoming today.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BellRing className="h-4 w-4 text-warning-foreground" /> Confirmations due ({data.confirmationsDue.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.confirmationsDue.length === 0 && <p className="text-sm text-muted-foreground">All confirmed 🎉</p>}
          {data.confirmationsDue.map((a) => (
            <Listing key={a.id} appt={a} timezone={timezone}>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => act(a.id, "confirmed")}>
                Confirm
              </Button>
            </Listing>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <DoorOpen className="h-4 w-4 text-accent" /> Waiting room ({data.arrived.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.arrived.length === 0 && <p className="text-sm text-muted-foreground">No one waiting.</p>}
          {data.arrived.map((a) => (
            <Listing key={a.id} appt={a} timezone={timezone}>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => act(a.id, "seated")}>
                <CheckCheck className="h-3.5 w-3.5" /> Seat
              </Button>
            </Listing>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-warning-foreground" /> ASAP / Waitlist ({waitlist.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {waitlist.length === 0 && <p className="text-sm text-muted-foreground">No one waiting for a slot.</p>}
          {waitlist.map((w) => (
            <div key={w.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1 truncate text-sm font-medium">
                  {w.asap && <Zap className="h-3 w-3 text-warning-foreground" />} {w.patientName}
                </div>
                <div className="text-xs text-muted-foreground">{w.typeName ?? "Any"}</div>
              </div>
              <Button size="sm" variant="outline" disabled={pending || !w.phone} onClick={() => notify(w.id)}>
                <MessageSquare className="h-3.5 w-3.5" /> Notify
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3 text-center shadow-sm">
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function Listing({ appt, timezone, children }: { appt: DayAppointment; timezone: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 p-2.5 transition-colors hover:bg-secondary/40">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{appt.patientName}</div>
        <div className="text-xs text-muted-foreground">{localTime(appt.startAt, timezone)} · {appt.typeName}</div>
      </div>
      {children}
    </div>
  );
}
