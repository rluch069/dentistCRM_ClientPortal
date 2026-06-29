import { loadRootEnv } from "../env";
import { ensureControlPlane } from "../control-setup";
import { openControlConnection, listTenants, getTenantConnString, setTenantSchemaVersion } from "../registry";
import { migrateTenant, latestTenantSchemaVersion } from "../migrator";

/**
 * Fleet migration runner: apply pending tenant migrations to every clinic DB.
 * Pass --dry-run to only report versions. Control plane + canary should run first.
 */
async function main() {
  loadRootEnv();
  const dryRun = process.argv.includes("--dry-run");

  await ensureControlPlane();
  const control = openControlConnection();
  try {
    const all = await listTenants(control.db);
    const target = latestTenantSchemaVersion();
    console.log(`Fleet migration — ${all.length} tenant(s), target schema version v${target}${dryRun ? " (dry-run)" : ""}`);

    let migrated = 0;
    for (const t of all) {
      const tag = `${t.slug} (db=${t.dbName}, v${t.schemaVersion})`;
      if (t.schemaVersion >= target && !dryRun) {
        console.log(`  · ${tag} — up to date`);
        continue;
      }
      if (dryRun) {
        console.log(`  · ${tag} — would migrate to v${target}`);
        continue;
      }
      const conn = await getTenantConnString(control.db, t.id);
      if (!conn) {
        console.warn(`  ! ${tag} — no credential, skipping`);
        continue;
      }
      try {
        await migrateTenant(conn);
        await setTenantSchemaVersion(control.db, t.id, target);
        migrated++;
        console.log(`  ✓ ${tag} → v${target}`);
      } catch (err) {
        console.error(`  ✗ ${tag} — migration failed:`, (err as Error).message);
      }
    }
    console.log(dryRun ? "Dry run complete." : `Done. Migrated ${migrated} tenant(s).`);
  } finally {
    await control.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fleet migration failed:", err);
    process.exit(1);
  });
