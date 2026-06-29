import { eq } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import { staffUsers, providers } from "@dentalos/db/tenant";
import type { StaffRole } from "@dentalos/core/constants";
import { PROVIDER_ROLES } from "@dentalos/core/constants";
import { hashPassword, verifyPassword } from "./password";

export interface CreateStaffAccountInput {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
  /** Also create a scheduling provider linked to this staff user. */
  asProvider?: boolean;
  providerColor?: string;
}

export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
}

export async function createStaffAccount(db: TenantDb, input: CreateStaffAccountInput): Promise<StaffAccount> {
  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(staffUsers)
    .values({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
    })
    .returning({ id: staffUsers.id, name: staffUsers.name, email: staffUsers.email, role: staffUsers.role });

  const account = row!;
  const shouldBeProvider = input.asProvider ?? PROVIDER_ROLES.includes(input.role);
  if (shouldBeProvider) {
    await db.insert(providers).values({
      staffUserId: account.id,
      displayName: input.name,
      role: input.role,
      color: input.providerColor ?? "#2563eb",
    });
  }
  return account;
}

/** Verify email+password against the tenant's staff table. Returns the account or null. */
export async function verifyStaffLogin(db: TenantDb, email: string, password: string): Promise<StaffAccount | null> {
  const rows = await db.select().from(staffUsers).where(eq(staffUsers.email, email.toLowerCase())).limit(1);
  const user = rows[0];
  if (!user || !user.isActive) return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  await db.update(staffUsers).set({ lastLoginAt: new Date() }).where(eq(staffUsers.id, user.id));
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function getStaffById(db: TenantDb, id: string): Promise<StaffAccount | null> {
  const rows = await db.select().from(staffUsers).where(eq(staffUsers.id, id)).limit(1);
  const u = rows[0];
  return u ? { id: u.id, name: u.name, email: u.email, role: u.role } : null;
}
