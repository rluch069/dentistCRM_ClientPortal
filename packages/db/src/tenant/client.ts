import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type TenantSchema = typeof schema;

export interface TenantConnection {
  db: ReturnType<typeof drizzle<TenantSchema>>;
  sql: ReturnType<typeof postgres>;
  close: () => Promise<void>;
}

/**
 * Create a per-tenant DB connection. Pools are intentionally small because the
 * fleet is many mostly-idle clinics; the TenantResolver LRU-caches these.
 */
export function createTenantClient(connString: string, max = 3): TenantConnection {
  const sql = postgres(connString, { max, prepare: false, idle_timeout: 20, onnotice: () => undefined });
  const db = drizzle(sql, { schema });
  return { db, sql, close: () => sql.end({ timeout: 5 }) };
}

export type TenantDb = TenantConnection["db"];
export { schema as tenantSchema };
