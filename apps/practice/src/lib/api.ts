import type { ApiContext } from "@dentalos/api";
import { requireStaff, toStaffActor } from "./session";
import { getTenantContext } from "./tenant";

/** Build an ApiContext for a server action: authenticated staff + resolved tenant. */
export async function getApiContext(): Promise<ApiContext> {
  const session = await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) throw new Error("No clinic context");
  return { db: ctx.db, tenant: ctx.tenant, providers: ctx.providers, actor: toStaffActor(session) };
}
