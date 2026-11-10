"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requestOtp, verifyOtp, signSession, PATIENT_COOKIE } from "@dentalos/auth";
import { normalizeMuPhone } from "@dentalos/core";
import { findPatientByPhone } from "@dentalos/api";
import { getTenantContext } from "@/lib/tenant";
import { DEMO_PATIENTS } from "@/lib/demo-accounts";

const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 7 };

export interface RequestOtpState {
  ok?: boolean;
  phone?: string;
  devCode?: string;
  error?: string;
}

export async function requestOtpAction(_prev: RequestOtpState, formData: FormData): Promise<RequestOtpState> {
  const phone = normalizeMuPhone(String(formData.get("phone") ?? ""));
  if (!phone) return { error: "Enter a valid Mauritius mobile number." };
  const ctx = await getTenantContext();
  if (!ctx) return { error: "Clinic not found." };
  const res = await requestOtp(ctx.db, phone, async (to, body) => {
    await ctx.providers.sms.send({ to, body });
  });
  return { ok: true, phone, devCode: res.devCode };
}

export interface VerifyOtpState {
  error?: string;
}

export async function verifyOtpAction(_prev: VerifyOtpState, formData: FormData): Promise<VerifyOtpState> {
  const phone = String(formData.get("phone") ?? "");
  const code = String(formData.get("code") ?? "");
  const ctx = await getTenantContext();
  if (!ctx) return { error: "Clinic not found." };

  const result = await verifyOtp(ctx.db, phone, code);
  if (!result.ok) return { error: "Invalid or expired code." };

  const c = await cookies();
  if (result.patientId) {
    const token = await signSession({ kind: "patient", sub: result.patientId, tenantId: ctx.tenant.id, slug: ctx.slug, phone });
    c.set(PATIENT_COOKIE, token, COOKIE_OPTS);
    redirect("/");
  } else {
    const token = await signSession({ kind: "verified_phone", phone, tenantId: ctx.tenant.id, slug: ctx.slug });
    c.set(PATIENT_COOKIE, token, COOKIE_OPTS);
    redirect("/book");
  }
  return {};
}

/**
 * One-click demo sign-in: skips the SMS code entirely (so it also works in production builds).
 * Only accepts seeded demo patients, only while dev mode is on.
 */
export async function demoLoginAction(formData: FormData): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEV_MODE === "false") return;
  const ctx = await getTenantContext();
  const phone = String(formData.get("phone") ?? "");
  if (!ctx || !DEMO_PATIENTS[ctx.slug]?.some((p) => p.phone === phone)) return;

  const patient = await findPatientByPhone(ctx.db, phone);
  if (!patient) return;

  const token = await signSession({ kind: "patient", sub: patient.id, tenantId: ctx.tenant.id, slug: ctx.slug, phone });
  (await cookies()).set(PATIENT_COOKIE, token, COOKIE_OPTS);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const c = await cookies();
  c.delete(PATIENT_COOKIE);
  redirect("/login");
}
