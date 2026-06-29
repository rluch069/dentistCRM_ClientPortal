import type { AppointmentStatus } from "@dentalos/core";
import type { BadgeProps } from "@dentalos/ui";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * Single source of truth for clinical status color-coding used in inline SVG / style props
 * (the calendar stripe + odontogram swatches), where Tailwind tokens can't reach.
 */
export const APPT_STATUS_META: Record<
  AppointmentStatus,
  { label: string; stripe: string; badge: BadgeVariant }
> = {
  booked: { label: "Booked", stripe: "#94a3b8", badge: "secondary" },
  confirmed: { label: "Confirmed", stripe: "#2563eb", badge: "default" },
  arrived: { label: "Arrived", stripe: "#f59e0b", badge: "warning" },
  seated: { label: "Seated", stripe: "#8b5cf6", badge: "default" },
  completed: { label: "Completed", stripe: "#10b981", badge: "success" },
  no_show: { label: "No-show", stripe: "#ef4444", badge: "destructive" },
  cancelled: { label: "Cancelled", stripe: "#9ca3af", badge: "outline" },
  broken: { label: "Broken", stripe: "#ef4444", badge: "destructive" },
};

/** Odontogram charting status → swatch color. */
export const CHART_STATUS_COLOR: Record<string, string> = {
  planned: "#2563eb",
  completed: "#10b981",
  existing: "#94a3b8",
  condition: "#ef4444",
};
