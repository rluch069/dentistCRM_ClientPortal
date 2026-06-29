import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyStaffSession, STAFF_COOKIE, hasPermission, type StaffSession, type Permission } from "@dentalos/auth";
import type { StaffActor } from "@dentalos/api";

export async function getStaffSession(): Promise<StaffSession | null> {
  const c = await cookies();
  return verifyStaffSession(c.get(STAFF_COOKIE)?.value);
}

export async function requireStaff(): Promise<StaffSession> {
  const s = await getStaffSession();
  if (!s) redirect("/login");
  return s;
}

export async function requirePermission(permission: Permission): Promise<StaffSession> {
  const s = await requireStaff();
  if (!hasPermission(s.role, permission)) redirect("/dashboard");
  return s;
}

export function toStaffActor(session: StaffSession): StaffActor {
  return { kind: "staff", staffUserId: session.sub, role: session.role, name: session.name };
}
