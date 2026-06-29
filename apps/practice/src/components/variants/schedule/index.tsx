"use client";

import { useVariant } from "@dentalos/ui";
import type { ScheduleData } from "./types";
import { ClinicGrid } from "./clinic-grid";
import { SoloDay } from "./solo-day";
import { Agenda } from "./agenda";
import { WeekView } from "./week";

const LABELS = ["Clinic grid", "Solo day", "Agenda", "Week"];

export function ScheduleVariants({ initial, data }: { initial: number; data: ScheduleData }) {
  const v = useVariant("schedule", "Schedule view", LABELS, initial);
  if (v === 1) return <SoloDay data={data} />;
  if (v === 2) return <Agenda data={data} />;
  if (v === 3) return <WeekView data={data} />;
  return <ClinicGrid data={data} />;
}
