/**
 * DentalOS background worker.
 *
 * Every tick it lists active clinics from the control plane and dispatches any
 * due notifications (booking confirmations, scheduled reminders, recall) for
 * each tenant via the configured providers (mock SMS/email in dev). This is the
 * piece that "fires" reminders. pg-boss / per-DB queues can replace the loop
 * later for durability; the dispatch logic itself lives in @dentalos/notifications.
 */
import { loadRootEnv, ensureControlPlane, openControlConnection, listTenants, getTenantResolver } from "@dentalos/tenancy";
import { getProviders } from "@dentalos/providers";
import { dispatchDueNotifications, enqueueDueRecalls } from "@dentalos/notifications";

const INTERVAL_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  loadRootEnv();
  await ensureControlPlane();

  const control = openControlConnection();
  const resolver = getTenantResolver();
  const providers = getProviders();
  let running = true;

  const shutdown = async () => {
    running = false;
    await control.close().catch(() => undefined);
    await resolver.close().catch(() => undefined);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(`[worker] started — dispatching due notifications every ${INTERVAL_MS / 1000}s`);

  while (running) {
    try {
      const tenants = await listTenants(control.db, ["active"]);
      let total = 0;
      let recalls = 0;
      for (const t of tenants) {
        const resolved = await resolver.resolveBySlug(t.slug);
        if (!resolved) continue;
        recalls += await enqueueDueRecalls(resolved.db, { portalLink: `http://${t.slug}.localhost:3100/book` });
        total += await dispatchDueNotifications(resolved.db, providers);
      }
      if (recalls > 0) console.log(`[worker] enqueued ${recalls} recall(s)`);
      if (total > 0) console.log(`[worker] dispatched ${total} notification(s) across ${tenants.length} clinic(s)`);
    } catch (err) {
      console.error("[worker] tick error:", (err as Error).message);
    }
    await sleep(INTERVAL_MS);
  }
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
