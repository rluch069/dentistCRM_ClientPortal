import { cookies } from "next/headers";
import { verifyPortalToken, type PatientSession, type VerifiedPhone } from "@dentalos/auth";
import { PATIENT_COOKIE } from "@dentalos/auth";

export type PortalIdentity = PatientSession | VerifiedPhone;

export async function getPortalToken(): Promise<PortalIdentity | null> {
  const c = await cookies();
  return verifyPortalToken(c.get(PATIENT_COOKIE)?.value);
}

export async function getPatientSession(): Promise<PatientSession | null> {
  const token = await getPortalToken();
  return token && token.kind === "patient" ? token : null;
}
