import type { TenancyEnv } from "../env";
import type { ProvisioningDriver } from "./driver";
import { LocalPostgresDriver } from "./local";
import { NeonDriver } from "./neon";

export type { ProvisioningDriver, ProvisionedDatabase } from "./driver";
export { LocalPostgresDriver } from "./local";
export { NeonDriver } from "./neon";

export function createProvisioningDriver(env: TenancyEnv): ProvisioningDriver {
  switch (env.provisioningDriver) {
    case "neon":
      return new NeonDriver(env);
    case "local":
    default:
      return new LocalPostgresDriver(env);
  }
}
