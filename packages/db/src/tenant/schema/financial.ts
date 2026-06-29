import { pgTable, uuid, text, integer, bigint, timestamp, jsonb, date, index, uniqueIndex } from "drizzle-orm/pg-core";
import { invoiceStatusEnum, ledgerEntryTypeEnum, paymentMethodEnum, paymentStatusEnum } from "./_enums";
import { patients, staffUsers } from "./operational";
import { procedures, treatmentPlans } from "./clinical";

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    /** Sequential per-clinic invoice number (assigned at issue time). */
    number: integer("number"),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    subtotalCents: bigint("subtotal_cents", { mode: "number" }).notNull().default(0),
    taxCents: bigint("tax_cents", { mode: "number" }).notNull().default(0),
    totalCents: bigint("total_cents", { mode: "number" }).notNull().default(0),
    paidCents: bigint("paid_cents", { mode: "number" }).notNull().default(0),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    /** Placeholder for future MRA fiscalisation (IRN + QR). */
    qrPayload: text("qr_payload"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byPatient: index("invoices_patient_idx").on(t.patientId),
    byNumber: uniqueIndex("invoices_number_uidx").on(t.number),
  }),
);

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  procedureId: uuid("procedure_id").references(() => procedures.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull().default(1),
  unitCents: bigint("unit_cents", { mode: "number" }).notNull().default(0),
  totalCents: bigint("total_cents", { mode: "number" }).notNull().default(0),
});

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    method: paymentMethodEnum("method").notNull(),
    status: paymentStatusEnum("status").notNull().default("captured"),
    reference: text("reference"),
    gatewayRef: text("gateway_ref"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    receivedByStaffId: uuid("received_by_staff_id").references(() => staffUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byPatient: index("payments_patient_idx").on(t.patientId) }),
);

/** Append-only patient ledger. Charges positive, payments/credits negative. */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    type: ledgerEntryTypeEnum("type").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    description: text("description").notNull(),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
    procedureId: uuid("procedure_id").references(() => procedures.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byPatient: index("ledger_entries_patient_idx").on(t.patientId) }),
);

/** Quote/estimate with the Mauritius "pay now vs claim back" split. */
export const estimates = pgTable("estimates", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  treatmentPlanId: uuid("treatment_plan_id").references(() => treatmentPlans.id, { onDelete: "set null" }),
  totalCents: bigint("total_cents", { mode: "number" }).notNull().default(0),
  payNowCents: bigint("pay_now_cents", { mode: "number" }).notNull().default(0),
  claimBackCents: bigint("claim_back_cents", { mode: "number" }).notNull().default(0),
  status: text("status").notNull().default("draft"), // draft | sent | accepted | rejected
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  signatureRef: text("signature_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentPlans = pgTable("payment_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  totalCents: bigint("total_cents", { mode: "number" }).notNull(),
  installmentCents: bigint("installment_cents", { mode: "number" }).notNull(),
  frequency: text("frequency").notNull().default("monthly"),
  nextDueAt: timestamp("next_due_at", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reconciliationReports = pgTable("reconciliation_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessDate: date("business_date").notNull(),
  totalsByMethod: jsonb("totals_by_method").$type<Record<string, number>>().notNull().default({}),
  totalCents: bigint("total_cents", { mode: "number" }).notNull().default(0),
  openedByStaffId: uuid("opened_by_staff_id").references(() => staffUsers.id, { onDelete: "set null" }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
