"use client";

import { useVariant } from "@dentalos/ui";
import type { BookingProps } from "./types";
import { BookingWizardVariant } from "./wizard";
import { QuickBook } from "./quick";
import { CalendarBook } from "./calendar";

const LABELS = ["Wizard", "Quick", "Calendar"];

export function BookingVariants({ initial, data }: { initial: number; data: BookingProps }) {
  const v = useVariant("booking", "Booking flow", LABELS, initial);
  if (v === 1) return <QuickBook {...data} />;
  if (v === 2) return <CalendarBook {...data} />;
  return <BookingWizardVariant {...data} />;
}
