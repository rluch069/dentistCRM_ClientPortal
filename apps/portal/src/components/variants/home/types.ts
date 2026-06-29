export interface ApptLite {
  id: string;
  typeName: string;
  startAt: string;
  providerName: string;
  status: string;
}

export interface HomeData {
  firstName: string;
  balanceCents: number;
  timezone: string;
  next: { startAt: string; typeName: string; providerName: string } | null;
  upcoming: ApptLite[];
  past: ApptLite[];
  notifications: { id: string; subject: string | null; body: string }[];
}
