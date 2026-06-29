import type { TenantDb } from "@dentalos/db";
import { auditLogs } from "@dentalos/db/tenant";
import type { Actor } from "./context";

export async function writeAudit(
  db: TenantDb,
  actor: Actor,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const actorId = actor.kind === "staff" ? actor.staffUserId : actor.kind === "patient" ? actor.patientId : null;
  await db.insert(auditLogs).values({ actorType: actor.kind, actorId, action, entityType, entityId, metadata });
}
