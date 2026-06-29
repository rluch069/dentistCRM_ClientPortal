import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { CONTROL_MIGRATIONS_DIR, TENANT_MIGRATIONS_DIR } from "@dentalos/db";

async function runMigrations(connString: string, migrationsFolder: string): Promise<void> {
  const sql = postgres(connString, { max: 1, prepare: false, onnotice: () => undefined });
  try {
    await migrate(drizzle(sql), { migrationsFolder });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function migrateControl(connString: string): Promise<void> {
  await runMigrations(connString, CONTROL_MIGRATIONS_DIR);
}

export async function migrateTenant(connString: string): Promise<void> {
  await runMigrations(connString, TENANT_MIGRATIONS_DIR);
}

/** The latest tenant schema version = number of entries in the drizzle journal. */
export function latestTenantSchemaVersion(): number {
  try {
    const journal = JSON.parse(readFileSync(join(TENANT_MIGRATIONS_DIR, "meta", "_journal.json"), "utf8")) as {
      entries: unknown[];
    };
    return journal.entries.length;
  } catch {
    return 0;
  }
}
