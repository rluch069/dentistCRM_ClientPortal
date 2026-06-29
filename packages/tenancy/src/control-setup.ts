import postgres from "postgres";
import { getTenancyEnv } from "./env";
import { migrateControl } from "./migrator";

/** Ensure the control-plane database exists and is migrated. Idempotent. */
export async function ensureControlPlane(): Promise<string> {
  const env = getTenancyEnv();
  const dbName = new URL(env.controlPlaneUrl).pathname.replace(/^\//, "");
  const admin = postgres(env.adminUrl, { max: 1, prepare: false });
  try {
    const existing = await admin`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (existing.length === 0) {
      await admin.unsafe(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await admin.end({ timeout: 5 });
  }
  await migrateControl(env.controlPlaneUrl);
  return dbName;
}
