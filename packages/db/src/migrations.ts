import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// packages/db/src → resolve the generated migration folders relative to this file
// so callers work regardless of process.cwd().
const here = dirname(fileURLToPath(import.meta.url));

export const CONTROL_MIGRATIONS_DIR = join(here, "..", "drizzle", "control");
export const TENANT_MIGRATIONS_DIR = join(here, "..", "drizzle", "tenant");
