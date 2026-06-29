"use client";

import { BookingWizard } from "../../booking-wizard";
import type { BookingProps } from "./types";

/** V1 — the original step-by-step booking wizard. */
export function BookingWizardVariant(props: BookingProps) {
  return <BookingWizard {...props} />;
}
