import postgres from "postgres";
import type { ProvisioningDriver, ProvisionedDatabase } from "./driver";
import type { TenancyEnv } from "../env";

/** Creates one real Postgres database per clinic on the configured server. */
export class LocalPostgresDriver implements ProvisioningDriver {
  readonly name = "local" as const;
  constructor(private readonly env: TenancyEnv) {}

  private dbNameFor(slug: string): string {
    return `${this.env.tenant.prefix}${slug.replace(/-/g, "_")}`;
  }

  private connStringFor(dbName: string): string {
    const { host, port, user, password } = this.env.tenant;
    const auth = password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}` : encodeURIComponent(user);
    return `postgresql://${auth}@${host}:${port}/${dbName}`;
  }

  async createDatabase(slug: string): Promise<ProvisionedDatabase> {
    const dbName = this.dbNameFor(slug);
    const admin = postgres(this.env.adminUrl, { max: 1, prepare: false });
    try {
      const existing = await admin`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
      if (existing.length === 0) {
        // CREATE DATABASE cannot run inside a transaction; unsafe() issues a simple query.
        await admin.unsafe(`CREATE DATABASE "${dbName}"`);
      }
    } finally {
      await admin.end({ timeout: 5 });
    }
    return { dbName, connString: this.connStringFor(dbName), driver: "local" };
  }

  async dropDatabase(dbName: string): Promise<void> {
    const admin = postgres(this.env.adminUrl, { max: 1, prepare: false });
    try {
      // Terminate other connections, then drop.
      await admin`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${dbName} AND pid <> pg_backend_pid()`;
      await admin.unsafe(`DROP DATABASE IF EXISTS "${dbName}"`);
    } finally {
      await admin.end({ timeout: 5 });
    }
  }
}
