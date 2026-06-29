import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type ControlSchema = typeof schema;

export interface ControlConnection {
  db: ReturnType<typeof drizzle<ControlSchema>>;
  sql: ReturnType<typeof postgres>;
  close: () => Promise<void>;
}

/** Create a control-plane DB connection. Pool kept small; this is one shared DB. */
export function createControlClient(connString: string, max = 5): ControlConnection {
  const sql = postgres(connString, { max, prepare: false, onnotice: () => undefined });
  const db = drizzle(sql, { schema });
  return { db, sql, close: () => sql.end({ timeout: 5 }) };
}

export type ControlDb = ControlConnection["db"];
