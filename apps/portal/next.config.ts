import type { NextConfig } from "next";
import { loadRootEnv } from "@dentalos/tenancy";

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
