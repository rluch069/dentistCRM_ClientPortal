import type { PaymentRow } from "@dentalos/api";

export interface OutstandingRow {
  id: string;
  name: string;
  phone: string | null;
  balanceCents: number;
}

export interface BillingData {
  today: string;
  timezone: string;
  payments: PaymentRow[];
  outstanding: OutstandingRow[];
}
