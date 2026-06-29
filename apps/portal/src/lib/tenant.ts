import { headers } from "next/headers";
import { getTenantResolver, loadRootEnv } from "@dentalos/tenancy";
import { getProviders } from "@dentalos/providers";
import type { TenantInfo } from "@dentalos/api";
import type { Locale } from "@dentalos/core/constants";
import type { TenantDb } from "@dentalos/db";

loadRootEnv();

export function slugFromHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0]!;
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;
  if (hostname.endsWith(".localhost")) {
    const label = hostname.slice(0, -".localhost".length);
    return label ? (label.split(".")[0] ?? null) : null;
  }
  const parts = hostname.split(".");
  return parts.length > 2 ? parts[0]! : null;
}

export interface PortalTenantContext {
  slug: string;
  tenant: TenantInfo;
  db: TenantDb;
  providers: ReturnType<typeof getProviders>;
}

export async function getTenantContext(): Promise<PortalTenantContext | null> {
  const h = await headers();
  const slug = h.get("x-tenant-slug") || slugFromHost(h.get("host"));
  if (!slug) return null;
  const resolved = await getTenantResolver().resolveBySlug(slug);
  if (!resolved) return null;
  return {
    slug,
    tenant: {
      id: resolved.tenant.id,
      slug: resolved.tenant.slug,
      name: resolved.tenant.name,
      locale: resolved.tenant.locale as Locale,
      timezone: resolved.tenant.timezone,
    },
    db: resolved.db,
    providers: getProviders(),
  };
}
