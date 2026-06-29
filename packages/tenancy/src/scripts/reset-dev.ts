import postgres from "postgres";
import { loadRootEnv, getTenancyEnv } from "../env";
import { openControlConnection, listTenants } from "../registry";
import { createProvisioningDriver } from "../provisioning/index";

/** DEV ONLY: drop every tenant database and the control-plane database. */
async function main() {
  loadRootEnv();
  const env = getTenancyEnv();
  if (env.provisioningDriver !== "local") {
    throw new Error("reset-dev only runs with the local provisioning driver");
  }
  const driver = createProvisioningDriver(env);

  // Drop tenant DBs listed in the control plane (if it exists).
  try {
    const control = openControlConnection();
    try {
      const all = await listTenants(control.db);
      for (const t of all) {
        console.log(`Dropping tenant DB: ${t.dbName}`);
        await driver.dropDatabase(t.dbName);
      }
    } finally {
      await control.close();
    }
  } catch (err) {
    console.warn("Skipping tenant cleanup (control DB may not exist):", (err as Error).message);
  }

  // Drop the control-plane DB itself.
  const dbName = new URL(env.controlPlaneUrl).pathname.replace(/^\//, "");
  const admin = postgres(env.adminUrl, { max: 1, prepare: false });
  try {
    await admin`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${dbName} AND pid <> pg_backend_pid()`;
    await admin.unsafe(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`Dropped control DB: ${dbName}`);
  } finally {
    await admin.end({ timeout: 5 });
  }
  console.log("✓ Dev reset complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Reset failed:", err);
    process.exit(1);
  });
