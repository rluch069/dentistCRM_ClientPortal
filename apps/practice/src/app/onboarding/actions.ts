"use server";

import { onboardClinic, ensureControlPlane } from "@dentalos/tenancy";
import { createStaffAccount } from "@dentalos/auth";
import { schemas } from "@dentalos/core";

export interface OnboardState {
  error?: string;
  ok?: boolean;
  slug?: string;
}

export async function createClinicAction(_prev: OnboardState, formData: FormData): Promise<OnboardState> {
  if (process.env.TENANT_SLUG) return { error: "Onboarding is disabled on this single-clinic deployment." };
  const phoneRaw = (formData.get("phone") as string | null)?.trim();
  const parsed = schemas.clinicOnboardingSchema.safeParse({
    clinicName: formData.get("clinicName"),
    slug: formData.get("slug"),
    ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"),
    ownerPassword: formData.get("ownerPassword"),
    locale: formData.get("locale") || "en",
    phone: phoneRaw || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;
  try {
    await ensureControlPlane();
    const result = await onboardClinic(
      { slug: input.slug, name: input.clinicName, locale: input.locale, phone: input.phone },
      {
        afterSeed: async ({ tenantDb }) => {
          await createStaffAccount(tenantDb, {
            name: input.ownerName,
            email: input.ownerEmail,
            password: input.ownerPassword,
            role: "owner",
          });
        },
      },
    );
    return { ok: true, slug: result.tenant.slug };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
