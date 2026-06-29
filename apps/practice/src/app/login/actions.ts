"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyStaffLogin, signSession, STAFF_COOKIE } from "@dentalos/auth";
import { getTenantContext } from "@/lib/tenant";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const ctx = await getTenantContext();
  if (!ctx) return { error: "No clinic selected. Open your clinic's address (e.g. demo.localhost:3000)." };

  const account = await verifyStaffLogin(ctx.db, email, password);
  if (!account) return { error: "Invalid email or password." };

  const token = await signSession({
    kind: "staff",
    sub: account.id,
    tenantId: ctx.tenant.id,
    slug: ctx.slug,
    role: account.role,
    name: account.name,
  });
  const c = await cookies();
  c.set(STAFF_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const c = await cookies();
  c.delete(STAFF_COOKIE);
  redirect("/login");
}
