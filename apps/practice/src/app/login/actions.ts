"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyStaffLogin, signSession, STAFF_COOKIE } from "@dentalos/auth";
import { getTenantContext } from "@/lib/tenant";
import { DEMO_PASSWORD, DEMO_STAFF } from "@/lib/demo-accounts";

export interface LoginState {
  error?: string;
}

async function signIn(email: string, password: string): Promise<LoginState> {
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

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  return signIn(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
}

/** One-click demo sign-in. Only accepts the seeded demo accounts, and only while dev mode is on. */
export async function demoLoginAction(formData: FormData): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEV_MODE === "false") return;
  const ctx = await getTenantContext();
  const email = String(formData.get("email") ?? "");
  if (!ctx || !DEMO_STAFF[ctx.slug]?.some((a) => a.email === email)) return;
  await signIn(email, DEMO_PASSWORD);
}

export async function logoutAction(): Promise<void> {
  const c = await cookies();
  c.delete(STAFF_COOKIE);
  redirect("/login");
}
