import { createHash } from "node:crypto";
import { and, eq, isNull, desc } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import { otpCodes, patients } from "@dentalos/db/tenant";
import { randomNumericCode } from "@dentalos/core";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(phone: string, code: string): string {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export interface RequestOtpResult {
  sent: boolean;
  /** Returned only outside production so dev can complete the flow without a real SMS. */
  devCode?: string;
}

export async function requestOtp(
  db: TenantDb,
  phone: string,
  sendSms: (to: string, body: string) => Promise<void>,
): Promise<RequestOtpResult> {
  const code = randomNumericCode(6);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await db.insert(otpCodes).values({ phone, codeHash: hashCode(phone, code), expiresAt });
  await sendSms(phone, `Your DentalOS verification code is ${code}. It expires in 5 minutes.`);
  return { sent: true, devCode: process.env.NODE_ENV === "production" ? undefined : code };
}

export interface VerifyOtpResult {
  ok: boolean;
  /** Existing patient id for this phone, or null if a new patient. */
  patientId?: string | null;
}

export async function verifyOtp(db: TenantDb, phone: string, code: string): Promise<VerifyOtpResult> {
  const rows = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  const otp = rows[0];
  if (!otp) return { ok: false };
  if (otp.expiresAt.getTime() < Date.now()) return { ok: false };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false };

  if (otp.codeHash !== hashCode(phone, code)) {
    await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id));
    return { ok: false };
  }

  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id));
  const existing = await db.select({ id: patients.id }).from(patients).where(eq(patients.phone, phone)).limit(1);
  return { ok: true, patientId: existing[0]?.id ?? null };
}
