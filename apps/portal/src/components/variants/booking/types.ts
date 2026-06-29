export interface BookingProps {
  isNew: boolean;
  timezone: string;
  fromDate: string;
  types: { id: string; name: string; durationMinutes: number; color: string }[];
  providers: { id: string; displayName: string }[];
}
