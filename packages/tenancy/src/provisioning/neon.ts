import type { ProvisioningDriver, ProvisionedDatabase } from "./driver";
import type { TenancyEnv } from "../env";

/**
 * Production driver: one Neon project per clinic via the Neon API.
 * Stubbed for v1 (dev uses LocalPostgresDriver). The shape is intentionally the
 * same as LocalPostgresDriver so onboarding code is driver-agnostic.
 *
 * Implementation outline (when enabling prod):
 *   POST https://console.neon.tech/api/v2/projects { project: { name, region_id } }
 *   -> read connection_uris[0].connection_uri as the tenant connString
 *   -> store project.id as dbName for later dropDatabase.
 */
export class NeonDriver implements ProvisioningDriver {
  readonly name = "neon" as const;
  constructor(private readonly env: TenancyEnv) {
    if (!env.neonApiKey) {
      throw new Error("NEON_API_KEY is required for the Neon provisioning driver");
    }
  }

  createDatabase(_slug: string): Promise<ProvisionedDatabase> {
    throw new Error("NeonDriver is not implemented yet; set PROVISIONING_DRIVER=local for dev");
  }

  dropDatabase(_dbName: string): Promise<void> {
    throw new Error("NeonDriver is not implemented yet");
  }
}
