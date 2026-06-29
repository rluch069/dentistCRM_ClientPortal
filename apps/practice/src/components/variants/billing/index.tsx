"use client";

import { useVariant } from "@dentalos/ui";
import type { BillingData } from "./types";
import { CloseDay } from "./reconciliation";
import { DaySheet } from "./day-sheet";
import { Outstanding } from "./outstanding";

const LABELS = ["Close day", "Day sheet", "Outstanding"];

export function BillingVariants({ initial, data }: { initial: number; data: BillingData }) {
  const v = useVariant("billing", "Billing view", LABELS, initial);
  if (v === 1) return <DaySheet data={data} />;
  if (v === 2) return <Outstanding data={data} />;
  return <CloseDay data={data} />;
}
