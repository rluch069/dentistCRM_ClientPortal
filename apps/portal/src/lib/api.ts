import type { ApiContext, PatientActor } from "@dentalos/api";
import { getTenantContext } from "./tenant";
import { getPatientSession } from "./session";

/** ApiContext for a logged-in patient acting on their own record, or null. */
export async function getPatientApiContext(): Promise<ApiContext | null> {
  const ctx = await getTenantContext();
  const session = await getPatientSession();
  if (!ctx || !session) return null;
  const actor: PatientActor = { kind: "patient", patientId: session.sub, phone: session.phone };
  return { db: ctx.db, tenant: ctx.tenant, providers: ctx.providers, actor };
}
