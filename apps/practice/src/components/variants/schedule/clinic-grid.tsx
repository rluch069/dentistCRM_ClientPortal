"use client";

import { ScheduleBoard } from "../../schedule-board";
import { ActionPanel } from "../../action-panel";
import type { ScheduleData } from "./types";

/** V1 — the original multi-operatory column grid + action panel (for multi-chair clinics). */
export function ClinicGrid({ data }: { data: ScheduleData }) {
  return (
    <div className="grid h-full grid-cols-[1fr_320px] overflow-hidden">
      <div className="overflow-hidden border-r border-border/60">
        <ScheduleBoard
          date={data.date}
          timezone={data.timezone}
          isToday={data.isToday}
          operatories={data.operatories}
          providers={data.providers}
          appointmentTypes={data.appointmentTypes}
          patients={data.patients}
          appointments={data.appointments}
        />
      </div>
      <div className="overflow-auto p-4">
        <ActionPanel data={data.actionPanel} waitlist={data.waitlist} timezone={data.timezone} />
      </div>
    </div>
  );
}
