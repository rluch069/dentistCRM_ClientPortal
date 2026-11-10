import { headers } from "next/headers";
import { getTenantResolver, loadRootEnv } from "@dentalos/tenancy";
import { getProviders } from "@dentalos/providers";
import type { ApiContext, TenantInfo } from "@dentalos/api";
import type { Locale } from "@dentalos/core/constants";

loadRootEnv();

/** Extract a clinic slug from a Host header. dev: {slug}.localhost; prod: {slug}.app.<domain>. */
export function slugFromHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0]!;
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;
  if (hostname.endsWith(".localhost")) {
    const label = hostname.slice(0, -".localhost".length);
    return label && !label.includes(".") ? label : (label.split(".")[0] ?? null);
  }
  const parts = hostname.split(".");
  return parts.length > 2 ? parts[0]! : null;
}

export async function getCurrentSlug(): Promise<string | null> {
  const h = await headers();
  // TENANT_SLUG pins one clinic (single-clinic deployments, e.g. *.vercel.app); otherwise the host decides.
  return process.env.TENANT_SLUG || slugFromHost(h.get("host"));
}

export interface ResolvedTenantContext {
  slug: string;
  tenant: TenantInfo;
  db: ApiContext["db"];
  providers: ApiContext["providers"];
}

/** Resolve the active clinic's DB + metadata, or null when on the root (onboarding) host. */
export async function getTenantContext(): Promise<ResolvedTenantContext | null> {
  const slug = await getCurrentSlug();
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
