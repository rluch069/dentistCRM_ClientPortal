import type { TenantDb } from "@dentalos/db";
import {
  practices,
  locations,
  operatories,
  operatoryHours,
  providers,
  providerHours,
  appointmentTypes,
  diagnoses,
  prescriptionFavorites,
} from "@dentalos/db/tenant";
import {
  DEFAULT_APPOINTMENT_TYPES,
  DEFAULT_DIAGNOSES,
  DEFAULT_PRESCRIPTION_FAVORITES,
  type Locale,
} from "@dentalos/core/constants";

export interface SeedTenantOptions {
  practiceName: string;
  locale?: Locale;
  timezone?: string;
  phone?: string;
  email?: string;
  /** Provider display names to seed (at least one so booking works). */
  providerNames?: string[];
  operatoryNames?: string[];
}

export interface SeedTenantResult {
  practiceId: string;
  locationId: string;
  operatoryIds: string[];
  providerIds: string[];
  appointmentTypeIds: string[];
}

const WEEKDAY_HOURS = { open: 540, close: 1020 }; // 09:00–17:00
const SATURDAY_HOURS = { open: 540, close: 780 }; // 09:00–13:00

/** Seed a freshly-migrated tenant database with sensible Mauritius defaults. */
export async function seedTenant(db: TenantDb, opts: SeedTenantOptions): Promise<SeedTenantResult> {
  const locale = opts.locale ?? "en";
  const timezone = opts.timezone ?? "Indian/Mauritius";

  const [practice] = await db
    .insert(practices)
    .values({ name: opts.practiceName, locale, timezone, phone: opts.phone, email: opts.email })
    .returning({ id: practices.id });

  const [location] = await db
    .insert(locations)
    .values({ name: opts.practiceName, isPrimary: true, phone: opts.phone })
    .returning({ id: locations.id });

  // Operatories (chairs) + their working hours.
  const opNames = opts.operatoryNames ?? ["Surgery 1", "Surgery 2", "Hygiene"];
  const opColors = ["#2563eb", "#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b"];
  const operatoryIds: string[] = [];
  for (let i = 0; i < opNames.length; i++) {
    const [op] = await db
      .insert(operatories)
      .values({ locationId: location!.id, name: opNames[i]!, color: opColors[i % opColors.length]!, displayOrder: i })
      .returning({ id: operatories.id });
    operatoryIds.push(op!.id);
    await db.insert(operatoryHours).values(buildWeekHours((dayOfWeek, h) => ({ operatoryId: op!.id, dayOfWeek, openMinute: h.open, closeMinute: h.close })));
  }

  // Providers (dentists) + their working hours.
  const provNames = opts.providerNames ?? ["Dr. Reception", "Dr. Sharma"];
  const providerIds: string[] = [];
  for (let i = 0; i < provNames.length; i++) {
    const [prov] = await db
      .insert(providers)
      .values({ displayName: provNames[i]!, role: "dentist", color: opColors[i % opColors.length]! })
      .returning({ id: providers.id });
    providerIds.push(prov!.id);
    await db.insert(providerHours).values(buildWeekHours((dayOfWeek, h) => ({ providerId: prov!.id, dayOfWeek, startMinute: h.open, endMinute: h.close })));
  }

  // Appointment types.
  const apptTypeRows = await db
    .insert(appointmentTypes)
    .values(
      DEFAULT_APPOINTMENT_TYPES.map((t, i) => ({
        name: t.name,
        durationMinutes: t.durationMinutes,
        scope: t.scope,
        color: t.color,
        recallIntervalMonths: t.recallIntervalMonths,
        displayOrder: i,
      })),
    )
    .returning({ id: appointmentTypes.id });

  // Diagnosis catalog + prescription favourites.
  await db.insert(diagnoses).values(DEFAULT_DIAGNOSES.map((label) => ({ label })));
  await db.insert(prescriptionFavorites).values(DEFAULT_PRESCRIPTION_FAVORITES.map((p) => ({ name: p.name, sig: p.sig, form: p.form })));

  return {
    practiceId: practice!.id,
    locationId: location!.id,
    operatoryIds,
    providerIds,
    appointmentTypeIds: apptTypeRows.map((r) => r.id),
  };
}

function buildWeekHours<T>(make: (dayOfWeek: number, hours: { open: number; close: number }) => T): T[] {
  const rows: T[] = [];
  for (let day = 1; day <= 5; day++) rows.push(make(day, WEEKDAY_HOURS));
  rows.push(make(6, SATURDAY_HOURS));
  return rows;
}
