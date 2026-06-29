import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/control/schema.ts",
  out: "./drizzle/control",
  verbose: true,
  strict: true,
});
