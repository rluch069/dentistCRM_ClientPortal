import type { TenantDb } from "@dentalos/db";
import type { Providers } from "@dentalos/providers";
import type { Locale, StaffRole } from "@dentalos/core/constants";

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  locale: Locale;
  timezone: string;
}

export interface StaffActor {
  kind: "staff";
  staffUserId: string;
  role: StaffRole;
  name: string;
}

export interface PatientActor {
  kind: "patient";
  patientId: string;
  phone: string;
}

export type Actor = StaffActor | PatientActor | { kind: "system" };

/** Everything a domain service needs: the tenant DB, tenant metadata, providers, and who's acting. */
export interface ApiContext {
  db: TenantDb;
  tenant: TenantInfo;
  providers: Providers;
  actor: Actor;
}
