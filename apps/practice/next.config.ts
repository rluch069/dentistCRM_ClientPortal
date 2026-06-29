import type { NextConfig } from "next";
import { loadRootEnv } from "@dentalos/tenancy";

// Populate process.env from the monorepo-root .env before the server starts.
loadRootEnv();

const config: NextConfig = {
  transpilePackages: [
    "@dentalos/core",
    "@dentalos/db",
    "@dentalos/tenancy",
    "@dentalos/auth",
    "@dentalos/providers",
    "@dentalos/notifications",
    "@dentalos/api",
    "@dentalos/ui",
  ],
  serverExternalPackages: ["postgres"],
  eslint: { ignoreDuringBuilds: true },
};

export default config;
