"use client";

import { useVariant } from "@dentalos/ui";
import type { PatientsData } from "./types";
import { PatientsList } from "./list";
import { PatientsCards } from "./cards";
import { PatientsTable } from "./table";

const LABELS = ["List", "Cards", "Table"];

export function PatientsVariants({ initial, data }: { initial: number; data: PatientsData }) {
  const v = useVariant("patients", "Patients view", LABELS, initial);
  if (v === 1) return <PatientsCards data={data} />;
  if (v === 2) return <PatientsTable data={data} />;
  return <PatientsList data={data} />;
}
