export interface PatientRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  locale: string;
  balanceCents: number;
  lastVisitAt: string | null;
  nextRecallAt: string | null;
}

export interface PatientsData {
  patients: PatientRow[];
  timezone: string;
}
