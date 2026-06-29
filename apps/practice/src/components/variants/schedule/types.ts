import type { DayAppointment, ActionPanel, WaitlistItem } from "@dentalos/api";

/** Shared data bundle passed to every schedule variant (all reuse the same props). */
export interface ScheduleData {
  date: string;
  timezone: string;
  isToday: boolean;
  operatories: { id: string; name: string; color: string }[];
  providers: { id: string; displayName: string; color: string }[];
  appointmentTypes: { id: string; name: string; durationMinutes: number; color: string }[];
  patients: { id: string; name: string }[];
  appointments: DayAppointment[];
  weekStart: string;
  weekAppointments: DayAppointment[];
  actionPanel: ActionPanel;
  waitlist: WaitlistItem[];
}
