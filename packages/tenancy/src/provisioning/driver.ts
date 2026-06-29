export interface ProvisionedDatabase {
  /** Physical Postgres database name (local) or Neon project id (prod). */
  dbName: string;
  /** Full connection string to the freshly created tenant database. */
  connString: string;
  driver: "local" | "neon";
}

/**
 * Abstracts "give me an isolated database for this clinic". LocalPostgresDriver
 * creates a real database on the dev/server Postgres; NeonDriver creates a Neon
 * project per clinic in production. Both yield a connection string we then
 * migrate + seed + store (encrypted) in the control plane.
 */
export interface ProvisioningDriver {
  readonly name: "local" | "neon";
  createDatabase(slug: string): Promise<ProvisionedDatabase>;
  dropDatabase(dbName: string): Promise<void>;
}
