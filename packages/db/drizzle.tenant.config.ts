import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/tenant/schema/index.ts",
  out: "./drizzle/tenant",
  verbose: true,
  strict: true,
});
