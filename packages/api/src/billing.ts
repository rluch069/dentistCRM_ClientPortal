import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { TenantDb } from "@dentalos/db";
import {
  invoices,
  invoiceLineItems,
  payments,
  ledgerEntries,
  estimates,
  reconciliationReports,
  procedures,
  patients,
  practices,
} from "@dentalos/db/tenant";
import type { PaymentMethod } from "@dentalos/core/constants";
import { addDays, clinicLocalToUtc, addDaysYmd, formatMoney } from "@dentalos/core";
import { createNotifications } from "@dentalos/notifications";
import type { ApiContext } from "./context";
import { writeAudit } from "./audit";

// ── Ledger + balance ─────────────────────────────────────────────────────────

/** Recompute the denormalised patient balance from the ledger (single source of truth). */
export async function recomputeBalance(db: TenantDb, patientId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${ledgerEntries.amountCents}), 0)::bigint` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.patientId, patientId));
  const balance = Number(row?.total ?? 0);
  await db.update(patients).set({ balanceCents: balance, updatedAt: new Date() }).where(eq(patients.id, patientId));
  return balance;
}

export async function getLedger(db: TenantDb, patientId: string) {
  return db.select().from(ledgerEntries).where(eq(ledgerEntries.patientId, patientId)).orderBy(desc(ledgerEntries.createdAt));
}

export async function postCharge(
  ctx: ApiContext,
  input: { patientId: string; amountCents: number; description: string; procedureId?: string; invoiceId?: string },
): Promise<number> {
  await ctx.db.insert(ledgerEntries).values({
    patientId: input.patientId,
    type: "charge",
    amountCents: input.amountCents,
    description: input.description,
    procedureId: input.procedureId ?? null,
    invoiceId: input.invoiceId ?? null,
  });
  await writeAudit(ctx.db, ctx.actor, "ledger.charge", "patient", input.patientId, { amountCents: input.amountCents });
  return recomputeBalance(ctx.db, input.patientId);
}

// ── Invoices ─────────────────────────────────────────────────────────────────

export interface InvoiceLineInput {
  description: string;
  amountCents: number;
  procedureId?: string;
}

export async function createInvoice(ctx: ApiContext, input: { patientId: string; lines: InvoiceLineInput[] }): Promise<string> {
  const subtotal = input.lines.reduce((s, l) => s + l.amountCents, 0);
  const [inv] = await ctx.db
    .insert(invoices)
    .values({ patientId: input.patientId, status: "draft", subtotalCents: subtotal, totalCents: subtotal })
    .returning({ id: invoices.id });
  if (input.lines.length > 0) {
    await ctx.db.insert(invoiceLineItems).values(
      input.lines.map((l) => ({ invoiceId: inv!.id, description: l.description, procedureId: l.procedureId ?? null, quantity: 1, unitCents: l.amountCents, totalCents: l.amountCents })),
    );
  }
  await writeAudit(ctx.db, ctx.actor, "invoice.create", "patient", input.patientId, { invoiceId: inv!.id });
  return inv!.id;
}

export async function createInvoiceFromProcedures(ctx: ApiContext, patientId: string, procedureIds: string[]): Promise<string> {
  const procs = procedureIds.length ? await ctx.db.select().from(procedures).where(inArray(procedures.id, procedureIds)) : [];
  const lines: InvoiceLineInput[] = procs.map((p) => ({
    description: p.toothFdi ? `${p.name} (tooth ${p.toothFdi})` : p.name,
    amountCents: p.feeCents,
    procedureId: p.id,
  }));
  return createInvoice(ctx, { patientId, lines });
}

/** Issue a draft invoice: assign a sequential per-clinic number + post the charge. */
export async function issueInvoice(ctx: ApiContext, invoiceId: string): Promise<number> {
  const inv = (await ctx.db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1))[0];
  if (!inv) throw new Error("Invoice not found");
  if (inv.status !== "draft") throw new Error("Invoice already issued");

  let number = 0;
  await ctx.db.transaction(async (tx) => {
    const [m] = await tx.select({ max: sql<number>`coalesce(max(${invoices.number}), 0)::int` }).from(invoices);
    number = Number(m?.max ?? 0) + 1;
    await tx
      .update(invoices)
      .set({ number, status: "issued", issuedAt: new Date(), dueAt: addDays(new Date(), 30), updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));
    await tx.insert(ledgerEntries).values({ patientId: inv.patientId, type: "charge", amountCents: inv.totalCents, description: `Invoice #${number}`, invoiceId });
  });
  await recomputeBalance(ctx.db, inv.patientId);
  await writeAudit(ctx.db, ctx.actor, "invoice.issue", "invoice", invoiceId, { number });
  return number;
}

export async function getInvoice(db: TenantDb, invoiceId: string) {
  const invoice = (await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1))[0];
  if (!invoice) return null;
  const lines = await db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
  return { invoice, lines };
}

export async function listInvoices(db: TenantDb, patientId: string) {
  return db.select().from(invoices).where(eq(invoices.patientId, patientId)).orderBy(desc(invoices.createdAt));
}

// ── Payments ─────────────────────────────────────────────────────────────────

interface ApplyPaymentInput {
  patientId: string;
  invoiceId?: string;
  amountCents: number;
  method: PaymentMethod;
  reference?: string;
  gatewayRef?: string;
}

async function applyPayment(ctx: ApiContext, input: ApplyPaymentInput): Promise<string> {
  const receivedByStaffId = ctx.actor.kind === "staff" ? ctx.actor.staffUserId : null;
  const [pay] = await ctx.db
    .insert(payments)
    .values({
      patientId: input.patientId,
      invoiceId: input.invoiceId ?? null,
      amountCents: input.amountCents,
      method: input.method,
      status: "captured",
      reference: input.reference ?? null,
      gatewayRef: input.gatewayRef ?? null,
      receivedByStaffId,
    })
    .returning({ id: payments.id });

  // Ledger: payments are negative (reduce balance).
  await ctx.db.insert(ledgerEntries).values({
    patientId: input.patientId,
    type: "payment",
    amountCents: -input.amountCents,
    description: `Payment (${input.method})`,
    paymentId: pay!.id,
    invoiceId: input.invoiceId ?? null,
  });

  if (input.invoiceId) {
    const inv = (await ctx.db.select().from(invoices).where(eq(invoices.id, input.invoiceId)).limit(1))[0];
    if (inv) {
      const paidCents = inv.paidCents + input.amountCents;
      const status = paidCents >= inv.totalCents ? "paid" : "partially_paid";
      await ctx.db.update(invoices).set({ paidCents, status, updatedAt: new Date() }).where(eq(invoices.id, inv.id));
    }
  }

  await recomputeBalance(ctx.db, input.patientId);
  await sendReceipt(ctx, input.patientId, input.amountCents);
  await writeAudit(ctx.db, ctx.actor, "payment.record", "patient", input.patientId, { amountCents: input.amountCents, method: input.method });
  return pay!.id;
}

/** Record a payment taken directly (cash, card terminal). */
export async function recordPayment(ctx: ApiContext, input: ApplyPaymentInput): Promise<string> {
  return applyPayment(ctx, input);
}

/** Take an online payment via the configured gateway (mock captures instantly in dev). */
export async function payOnline(
  ctx: ApiContext,
  input: { patientId: string; invoiceId?: string; amountCents: number; method: PaymentMethod },
): Promise<string> {
  const res = await ctx.providers.payment.charge({
    amountCents: input.amountCents,
    currency: "MUR",
    method: input.method,
    reference: input.invoiceId ?? input.patientId,
  });
  if (res.status !== "captured") throw new Error(res.error ?? "Payment failed");
  return applyPayment(ctx, { ...input, gatewayRef: res.providerRef });
}

async function sendReceipt(ctx: ApiContext, patientId: string, amountCents: number): Promise<void> {
  const patient = (await ctx.db.select().from(patients).where(eq(patients.id, patientId)).limit(1))[0];
  const practice = (await ctx.db.select().from(practices).limit(1))[0];
  if (!patient || !practice) return;
  await createNotifications(ctx.db, {
    patientId,
    type: "payment_receipt",
    channels: ["sms", "email", "in_app"],
    locale: patient.locale,
    data: { clinicName: practice.name, patientName: patient.firstName, amount: formatMoney(amountCents, patient.locale) },
  });
}

// ── Estimates (pay-now vs claim-back) ────────────────────────────────────────

export async function createEstimate(
  ctx: ApiContext,
  input: { patientId: string; treatmentPlanId?: string; totalCents: number; coveragePct?: number },
): Promise<string> {
  const cov = Math.min(Math.max(input.coveragePct ?? 0, 0), 100);
  const claimBack = Math.round((input.totalCents * cov) / 100);
  const payNow = input.totalCents - claimBack;
  const [row] = await ctx.db
    .insert(estimates)
    .values({
      patientId: input.patientId,
      treatmentPlanId: input.treatmentPlanId ?? null,
      totalCents: input.totalCents,
      payNowCents: payNow,
      claimBackCents: claimBack,
      status: "sent",
    })
    .returning({ id: estimates.id });
  await writeAudit(ctx.db, ctx.actor, "estimate.create", "patient", input.patientId, { estimateId: row!.id });
  return row!.id;
}

export async function listEstimates(db: TenantDb, patientId: string) {
  return db.select().from(estimates).where(eq(estimates.patientId, patientId)).orderBy(desc(estimates.createdAt));
}

export interface PaymentRow {
  id: string;
  patientName: string;
  amountCents: number;
  method: PaymentMethod;
  reference: string | null;
  createdAt: string;
}

/** Captured payments taken on a clinic-local business date, newest first (day-sheet). */
export async function listPaymentsForDate(db: TenantDb, timezone: string, businessDate: string): Promise<PaymentRow[]> {
  const dayStart = clinicLocalToUtc(businessDate, 0, timezone);
  const dayEnd = clinicLocalToUtc(addDaysYmd(businessDate, 1), 0, timezone);
  const rows = await db
    .select({
      id: payments.id,
      amount: payments.amountCents,
      method: payments.method,
      reference: payments.reference,
      createdAt: payments.createdAt,
      first: patients.firstName,
      last: patients.lastName,
    })
    .from(payments)
    .innerJoin(patients, eq(patients.id, payments.patientId))
    .where(and(eq(payments.status, "captured"), gte(payments.createdAt, dayStart), lt(payments.createdAt, dayEnd)))
    .orderBy(desc(payments.createdAt));
  return rows.map((r) => ({
    id: r.id,
    patientName: `${r.first} ${r.last}`,
    amountCents: r.amount,
    method: r.method,
    reference: r.reference,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ── Daily reconciliation ─────────────────────────────────────────────────────

export async function dailyReconciliation(ctx: ApiContext, businessDate: string): Promise<{ totalsByMethod: Record<string, number>; totalCents: number }> {
  const tz = ctx.tenant.timezone;
  const dayStart = clinicLocalToUtc(businessDate, 0, tz);
  const dayEnd = clinicLocalToUtc(addDaysYmd(businessDate, 1), 0, tz);
  const rows = await ctx.db
    .select({ method: payments.method, amount: payments.amountCents })
    .from(payments)
    .where(and(eq(payments.status, "captured"), gte(payments.createdAt, dayStart), lt(payments.createdAt, dayEnd)));

  const totalsByMethod: Record<string, number> = {};
  let totalCents = 0;
  for (const r of rows) {
    totalsByMethod[r.method] = (totalsByMethod[r.method] ?? 0) + r.amount;
    totalCents += r.amount;
  }
  const openedByStaffId = ctx.actor.kind === "staff" ? ctx.actor.staffUserId : null;
  await ctx.db.insert(reconciliationReports).values({ businessDate, totalsByMethod, totalCents, openedByStaffId, closedAt: new Date() });
  await writeAudit(ctx.db, ctx.actor, "reconciliation.run", undefined, undefined, { businessDate, totalCents });
  return { totalsByMethod, totalCents };
}
