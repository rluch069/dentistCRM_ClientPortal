import { pgTable, uuid, text, integer, bigint, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { procedureStatusEnum, treatmentPlanStatusEnum } from "./_enums";
import { patients, providers, appointments, staffUsers } from "./operational";

/** Diagnosis catalog (curated; grows to SNODENT/ICD-10 later). */
export const diagnoses = pgTable("diagnoses", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code"),
  label: text("label").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Intrinsic per-tooth conditions/findings, separate from charted procedures. */
export const toothConditions = pgTable(
  "tooth_conditions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    toothFdi: integer("tooth_fdi").notNull(),
    conditionCode: text("condition_code").notNull(),
    note: text("note"),
    chartedByStaffId: uuid("charted_by_staff_id").references(() => staffUsers.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    chartedAt: timestamp("charted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byPatient: index("tooth_conditions_patient_idx").on(t.patientId) }),
);

export const treatmentPlans = pgTable("treatment_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Treatment Plan"),
  status: treatmentPlanStatusEnum("status").notNull().default("draft"),
  totalCents: bigint("total_cents", { mode: "number" }).notNull().default(0),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  signatureRef: text("signature_ref"),
  /** Immutable snapshot of the plan at acceptance time. */
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** The clinical spine: links tooth → treatment plan → ledger. */
export const procedures = pgTable(
  "procedures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    treatmentPlanId: uuid("treatment_plan_id").references(() => treatmentPlans.id, { onDelete: "set null" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    toothFdi: integer("tooth_fdi"),
    surfaces: jsonb("surfaces").$type<string[]>().notNull().default([]),
    status: procedureStatusEnum("status").notNull().default("planned"),
    priority: integer("priority").notNull().default(1),
    phase: integer("phase").notNull().default(1),
    feeCents: bigint("fee_cents", { mode: "number" }).notNull().default(0),
    providerId: uuid("provider_id").references(() => providers.id, { onDelete: "set null" }),
    diagnosisId: uuid("diagnosis_id").references(() => diagnoses.id, { onDelete: "set null" }),
    note: text("note"),
    plannedAt: timestamp("planned_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byPatient: index("procedures_patient_idx").on(t.patientId),
    byPlan: index("procedures_plan_idx").on(t.treatmentPlanId),
    byStatus: index("procedures_status_idx").on(t.status),
  }),
);

/** SOAP clinical notes — append-only / amendable, signable, audit-tracked. */
export const clinicalNotes = pgTable(
  "clinical_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    providerId: uuid("provider_id").references(() => providers.id, { onDelete: "set null" }),
    subjective: text("subjective"),
    objective: text("objective"),
    assessment: text("assessment"),
    plan: text("plan"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    signedByStaffId: uuid("signed_by_staff_id").references(() => staffUsers.id, { onDelete: "set null" }),
    amendedAt: timestamp("amended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byPatient: index("clinical_notes_patient_idx").on(t.patientId) }),
);

export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id").references(() => providers.id, { onDelete: "set null" }),
    items: jsonb("items").$type<Array<{ name: string; sig: string; quantity?: string }>>().notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byPatient: index("prescriptions_patient_idx").on(t.patientId) }),
);

export const prescriptionFavorites = pgTable("prescription_favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  sig: text("sig").notNull(),
  form: text("form"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    kind: text("kind").notNull().default("document"), // document | xray | photo | form
    uploadedByStaffId: uuid("uploaded_by_staff_id").references(() => staffUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byPatient: index("documents_patient_idx").on(t.patientId) }),
);
