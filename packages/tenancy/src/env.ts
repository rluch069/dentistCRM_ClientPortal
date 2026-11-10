/**
 * Server-side environment for tenancy (control plane, provisioning, resolver).
 * Loaded by scripts and the worker via loadRootEnv(); Next.js apps load .env
 * themselves, so reading process.env here is safe in all runtimes.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

let loaded = false;

/** Load the repo-root .env once (idempotent). No-op if already in process.env. */
export function loadRootEnv(): void {
  if (loaded) return;
  loaded = true;
  // Walk up from cwd to find a .env (covers running from root or a sub-app).
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, ".env");
    if (existsSync(candidate)) {
      try {
        // Node >= 20.12 / 22 provides process.loadEnvFile.
        (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile?.(candidate);
      } catch {
        /* ignore parse errors; env may already be set by the platform */
      }
      return;
    }
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export interface TenancyEnv {
  controlPlaneUrl: string;
  adminUrl: string;
  tenant: {
    host: string;
    port: number;
    user: string;
    password: string;
    prefix: string;
    /** e.g. "require" for hosted Postgres (Neon); appended to tenant connection strings. */
    sslmode: string | undefined;
  };
  provisioningDriver: "local" | "neon";
  neonApiKey: string | undefined;
  credentialEncryptionKey: string;
  appBaseDomain: string;
}

export function getTenancyEnv(): TenancyEnv {
  loadRootEnv();
  return {
    controlPlaneUrl: required("CONTROL_PLANE_DATABASE_URL"),
    adminUrl: process.env.DATABASE_ADMIN_URL ?? required("CONTROL_PLANE_DATABASE_URL"),
    tenant: {
      host: process.env.TENANT_DB_HOST ?? "localhost",
      port: Number(process.env.TENANT_DB_PORT ?? "5432"),
      user: process.env.TENANT_DB_USER ?? "postgres",
      password: process.env.TENANT_DB_PASSWORD ?? "",
      prefix: process.env.TENANT_DB_PREFIX ?? "dentalos_tenant_",
      sslmode: process.env.TENANT_DB_SSLMODE || undefined,
    },
    provisioningDriver: (process.env.PROVISIONING_DRIVER as "local" | "neon") ?? "local",
    neonApiKey: process.env.NEON_API_KEY || undefined,
    credentialEncryptionKey: required("CREDENTIAL_ENCRYPTION_KEY"),
    appBaseDomain: process.env.APP_BASE_DOMAIN ?? "localhost",
  };
}
