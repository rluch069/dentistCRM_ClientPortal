import { loadRootEnv } from "../env";
import { ensureControlPlane } from "../control-setup";

async function main() {
  loadRootEnv();
  const dbName = await ensureControlPlane();
  console.log(`✓ Control plane ready: ${dbName}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Control-plane provisioning failed:", err);
    process.exit(1);
  });
