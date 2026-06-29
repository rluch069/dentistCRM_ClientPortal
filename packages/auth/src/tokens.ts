import { SignJWT, jwtVerify } from "jose";
import type { StaffRole } from "@dentalos/core/constants";

export const STAFF_COOKIE = "dos_staff";
export const PATIENT_COOKIE = "dos_patient";

export interface StaffSession {
  kind: "staff";
  sub: string; // staffUsers.id
  tenantId: string;
  slug: string;
  role: StaffRole;
  name: string;
}

export interface PatientSession {
  kind: "patient";
  sub: string; // patients.id
  tenantId: string;
  slug: string;
  phone: string;
}

/** Issued after OTP verification when no patient record exists yet (new patient). */
export interface VerifiedPhone {
  kind: "verified_phone";
  phone: string;
  tenantId: string;
  slug: string;
}

export type Session = StaffSession | PatientSession | VerifiedPhone;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET / BETTER_AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function signSession(session: Session, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret());
}

export async function verifyStaffSession(token: string | undefined): Promise<StaffSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.kind === "staff" ? (payload as unknown as StaffSession) : null;
  } catch {
    return null;
  }
}

export async function verifyPatientSession(token: string | undefined): Promise<PatientSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.kind === "patient" ? (payload as unknown as PatientSession) : null;
  } catch {
    return null;
  }
}

/** Accept either a logged-in patient OR a freshly verified phone (new patient). */
export async function verifyPortalToken(token: string | undefined): Promise<PatientSession | VerifiedPhone | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind === "patient") return payload as unknown as PatientSession;
    if (payload.kind === "verified_phone") return payload as unknown as VerifiedPhone;
    return null;
  } catch {
    return null;
  }
}
