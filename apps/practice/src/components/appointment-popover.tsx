"use client";

import * as React from "react";
import { Avatar, Badge, Button, Card } from "@dentalos/ui";
import { APPOINTMENT_TRANSITIONS, type AppointmentStatus } from "@dentalos/core";
import type { DayAppointment } from "@dentalos/api";
import { Clock, Users, X } from "lucide-react";
import { APPT_STATUS_META } from "@/lib/status-colors";

const WIDTH = 288;
const MARGIN = 8;

function fmt12(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}

export interface AppointmentPopoverProps {
  appointment: DayAppointment;
  anchorRect: DOMRect;
  timezone: string;
  pending: boolean;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onClose: () => void;
}

/** Small card anchored beside the clicked appointment — replaces the old right-edge Drawer. */
export function AppointmentPopover({ appointment, anchorRect, timezone, pending, onStatusChange, onClose }: AppointmentPopoverProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({ opacity: 0, top: anchorRect.top, left: anchorRect.right + MARGIN });

  React.useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 240;
    let left = anchorRect.right + MARGIN;
    if (left + WIDTH > window.innerWidth - MARGIN) left = anchorRect.left - WIDTH - MARGIN;
    left = Math.max(MARGIN, left);
    const top = Math.min(Math.max(anchorRect.top, MARGIN), window.innerHeight - h - MARGIN);
    setStyle({ opacity: 1, top, left });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorRect]);

  const meta = APPT_STATUS_META[appointment.status];
  const transitions = APPOINTMENT_TRANSITIONS[appointment.status];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <Card
        ref={ref}
        style={{ ...style, width: WIDTH }}
        className="fixed z-50 animate-fade-in-up p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{appointment.patientName}</div>
            <div className="truncate text-xs text-muted-foreground">{appointment.typeName}</div>
          </div>
          <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            {fmt12(appointment.startAt, timezone)} – {fmt12(appointment.endAt, timezone)}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            <div className="flex -space-x-2">
              <Avatar name={appointment.patientName} className="h-6 w-6 text-[10px] ring-2 ring-card" />
              <Avatar name={appointment.providerName} className="h-6 w-6 text-[10px] ring-2 ring-card" />
            </div>
            <span className="truncate">
              {appointment.patientName} · {appointment.providerName}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <Badge variant={meta.badge}>{meta.label}</Badge>
        </div>

        {transitions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
            {transitions.map((s) => (
              <Button key={s} size="sm" variant="outline" disabled={pending} onClick={() => onStatusChange(appointment.id, s)}>
                {APPT_STATUS_META[s].label}
              </Button>
            ))}
          </div>
        )}

        <div className="mt-3 flex justify-end border-t border-border/60 pt-3">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </>
  );
}
