"use server";

import { cookies } from "next/headers";
import { computeAvailability, confirmBooking, type DayAvailability } from "@dentalos/api";
import { signSession, PATIENT_COOKIE } from "@dentalos/auth";
import type { Locale } from "@dentalos/core/constants";
import { getTenantContext } from "@/lib/tenant";
import { getPortalToken } from "@/lib/session";

export async function getAvailabilityAction(
  appointmentTypeId: string,
  providerId: string | null,
  fromDate: string,
): Promise<DayAvailability[]> {
  const ctx = await getTenantContext();
  if (!ctx) return [];
  return computeAvailability(ctx.db, ctx.tenant.timezone, { appointmentTypeId, providerId, fromDate, days: 14 });
}

export interface ConfirmBookingActionInput {
  appointmentTypeId: string;
  providerId: string | null;
  operatoryId?: string;
  startAt: string;
  newPatient?: { firstName: string; lastName: string; email?: string; locale?: Locale };
  note?: string;
}

export interface ConfirmResult {
  ok?: boolean;
  appointmentId?: string;
  error?: string;
}

export async function confirmBookingAction(input: ConfirmBookingActionInput): Promise<ConfirmResult> {
  const ctx = await getTenantContext();
  if (!ctx) return { error: "Clinic not found." };
  const token = await getPortalToken();
  if (!token) return { error: "Please sign in again." };

  const identity = token.kind === "patient" ? { patientId: token.sub, phone: token.phone } : { phone: token.phone };
  try {
    const result = await confirmBooking(
      { db: ctx.db, tenant: ctx.tenant, providers: ctx.providers },
      identity,
      { ...input, portalLink: process.env.PORTAL_URL ?? `http://${ctx.slug}.localhost:3100` },
    );
    if (token.kind !== "patient") {
      const newToken = await signSession({ kind: "patient", sub: result.patientId, tenantId: ctx.tenant.id, slug: ctx.slug, phone: token.phone });
      const c = await cookies();
      c.set(PATIENT_COOKIE, newToken, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    }
    return { ok: true, appointmentId: result.appointmentId };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
