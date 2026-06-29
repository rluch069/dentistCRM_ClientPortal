import { LRUCache } from "lru-cache";
import { createTenantClient, type TenantConnection, type TenantDb } from "@dentalos/db";
import type { ControlConnection } from "@dentalos/db";
import type { Tenant } from "@dentalos/db/control";
import { openControlConnection, getTenantBySlug, getTenantConnString } from "./registry";

export interface ResolvedTenant {
  tenant: Tenant;
  db: TenantDb;
  connString: string;
}

/**
 * Resolves a clinic slug to its isolated DB client. The #1 DB-per-tenant failure
 * mode is connection-pool explosion, so per-tenant connections are LRU-cached and
 * reused; tenant metadata is cached with a short TTL so status changes propagate.
 */
export class TenantResolver {
  private control: ControlConnection | null = null;
  private readonly metaCache: LRUCache<string, Tenant>;
  private readonly connCache: LRUCache<string, TenantConnection>;

  constructor(opts: { metaTtlMs?: number; maxConnections?: number } = {}) {
    this.metaCache = new LRUCache<string, Tenant>({
      max: 500,
      ttl: opts.metaTtlMs ?? 60_000,
    });
    this.connCache = new LRUCache<string, TenantConnection>({
      max: opts.maxConnections ?? 50,
      dispose: (conn) => {
        void conn.close().catch(() => undefined);
      },
    });
  }

  private getControl(): ControlConnection {
    if (!this.control) this.control = openControlConnection();
    return this.control;
  }

  async getTenantMeta(slug: string): Promise<Tenant | null> {
    const cached = this.metaCache.get(slug);
    if (cached) return cached;
    const tenant = await getTenantBySlug(this.getControl().db, slug);
    if (!tenant) return null;
    this.metaCache.set(slug, tenant);
    return tenant;
  }

  /** Resolve a slug to its active tenant DB, or null if missing/not active. */
  async resolveBySlug(slug: string): Promise<ResolvedTenant | null> {
    const tenant = await this.getTenantMeta(slug);
    if (!tenant || tenant.status !== "active") return null;

    let conn = this.connCache.get(tenant.id);
    if (!conn) {
      const connString = await getTenantConnString(this.getControl().db, tenant.id);
      if (!connString) return null;
      conn = createTenantClient(connString);
      this.connCache.set(tenant.id, conn);
      return { tenant, db: conn.db, connString };
    }
    // connString not re-decrypted on cache hit (perf); callers rarely need it.
    return { tenant, db: conn.db, connString: "" };
  }

  invalidate(slug: string): void {
    const tenant = this.metaCache.get(slug);
    this.metaCache.delete(slug);
    if (tenant) this.connCache.delete(tenant.id);
  }

  async close(): Promise<void> {
    for (const key of this.connCache.keys()) this.connCache.delete(key);
    if (this.control) await this.control.close();
    this.control = null;
  }
}

// Process-global singleton (Next.js dev hot-reload safe).
const globalForResolver = globalThis as unknown as { __dentalosResolver?: TenantResolver };

export function getTenantResolver(): TenantResolver {
  if (!globalForResolver.__dentalosResolver) {
    globalForResolver.__dentalosResolver = new TenantResolver();
  }
  return globalForResolver.__dentalosResolver;
}
