"use server";

import { payOnline } from "@dentalos/api";
import type { PaymentMethod } from "@dentalos/core/constants";
import { getPatientApiContext } from "@/lib/api";

export interface PayState {
  error?: string;
  ok?: boolean;
}

export async function payBalanceAction(amountCents: number, method: PaymentMethod): Promise<PayState> {
  const ctx = await getPatientApiContext();
  if (!ctx || ctx.actor.kind !== "patient") return { error: "Please sign in again." };
  if (amountCents <= 0) return { error: "Nothing to pay." };
  try {
    await payOnline(ctx, { patientId: ctx.actor.patientId, amountCents, method });
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
