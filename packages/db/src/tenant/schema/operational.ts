import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  staffRoleEnum,
  genderEnum,
  localeEnum,
  appointmentScopeEnum,
  appointmentStatusEnum,
  notificationChannelEnum,
  notificationTypeEnum,
  notificationStatusEnum,
} from "./_enums";

/** Single-row clinic profile + branding + locale defaults. */
export const practices = pgTable("practices", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  locale: localeEnum("locale").notNull().default("en"),
  timezone: text("timezone").notNull().default("Indian/Mauritius"),
  currency: text("currency").notNull().default("MUR"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  brandColor: text("brand_color").notNull().default("#2563eb"),
  logoStorageKey: text("logo_storage_key"),
  // Reminder cadence + quiet hours config (hours, in minutes-from-midnight).
  reminderOffsetsHours: jsonb("reminder_offsets_hours").$type<number[]>().notNull().default([168, 48, 24]),
  quietHoursStartMinute: integer("quiet_hours_start_minute").notNull().default(1260), // 21:00
  quietHoursEndMinute: integer("quiet_hours_end_minute").notNull().default(420), // 07:00
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  isPrimary: boolean("is_primary").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Operatories = chairs/columns in the schedule cockpit. */
export const operatories = pgTable("operatories", {
  id: uuid("id").primaryKey().defaultRandom(),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#94a3b8"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const operatoryHours = pgTable(
  "operatory_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operatoryId: uuid("operatory_id")
      .notNull()
      .references(() => operatories.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0=Sun .. 6=Sat
    openMinute: integer("open_minute").notNull(), // minutes from midnight (clinic tz)
    closeMinute: integer("close_minute").notNull(),
  },
  (t) => ({ byOp: index("operatory_hours_op_idx").on(t.operatoryId) }),
);

/** Staff users map 1:1 to Better Auth users (authUserId). */
export const staffUsers = pgTable(
  "staff_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    /** scrypt password hash for email+password login (per-tenant auth). */
    passwordHash: text("password_hash"),
    /** Reserved for future external auth provider linkage (e.g. Better Auth). */
    authUserId: text("auth_user_id"),
    role: staffRoleEnum("role").notNull().default("receptionist"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byEmail: uniqueIndex("staff_users_email_uidx").on(t.email),
  }),
);

/** Providers appear as scheduling resources (a staff member who delivers care). */
export const providers = pgTable("providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffUserId: uuid("staff_user_id").references(() => staffUsers.id, { onDelete: "set null" }),
  displayName: text("display_name").notNull(),
  role: staffRoleEnum("role").notNull().default("dentist"),
  color: text("color").notNull().default("#2563eb"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const providerHours = pgTable(
  "provider_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
  },
  (t) => ({ byProvider: index("provider_hours_provider_idx").on(t.providerId) }),
);

export const appointmentTypes = pgTable("appointment_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  scope: appointmentScopeEnum("scope").notNull().default("all"),
  color: text("color").notNull().default("#2563eb"),
  recallIntervalMonths: integer("recall_interval_months"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id").references(() => households.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: date("date_of_birth"),
    gender: genderEnum("gender").notNull().default("unspecified"),
    phone: text("phone"),
    email: text("email"),
    locale: localeEnum("locale").notNull().default("en"),
    address: text("address"),
    medicalHistory: text("medical_history"),
    allergies: text("allergies"),
    /** Better Auth user id once the patient activates the portal (phone+OTP). */
    portalAuthUserId: text("portal_auth_user_id"),
    /** Denormalised running balance in cents (negative = credit). */
    balanceCents: bigint("balance_cents", { mode: "number" }).notNull().default(0),
    lastVisitAt: timestamp("last_visit_at", { withTimezone: true }),
    nextRecallAt: timestamp("next_recall_at", { withTimezone: true }),
    smsOptOut: boolean("sms_opt_out").notNull().default(false),
    emailOptOut: boolean("email_opt_out").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byPhone: index("patients_phone_idx").on(t.phone),
    byName: index("patients_name_idx").on(t.lastName, t.firstName),
    byHousehold: index("patients_household_idx").on(t.householdId),
  }),
);

export const insurancePolicies = pgTable("insurance_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  insurerName: text("insurer_name").notNull(),
  policyNumber: text("policy_number"),
  memberName: text("member_name"),
  estimatedCoveragePct: integer("estimated_coverage_pct"),
  priority: integer("priority").notNull().default(1), // 1..3
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "restrict" }),
    operatoryId: uuid("operatory_id")
      .notNull()
      .references(() => operatories.id, { onDelete: "restrict" }),
    appointmentTypeId: uuid("appointment_type_id")
      .notNull()
      .references(() => appointmentTypes.id, { onDelete: "restrict" }),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    status: appointmentStatusEnum("status").notNull().default("booked"),
    note: text("note"),
    bookedVia: text("booked_via").notNull().default("staff"), // staff | portal
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    seatedAt: timestamp("seated_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdByStaffId: uuid("created_by_staff_id").references(() => staffUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byStart: index("appointments_start_idx").on(t.startAt),
    byOpStart: index("appointments_op_start_idx").on(t.operatoryId, t.startAt),
    byProviderStart: index("appointments_provider_start_idx").on(t.providerId, t.startAt),
    byPatient: index("appointments_patient_idx").on(t.patientId),
  }),
);

export const appointmentStatusHistory = pgTable("appointment_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id")
    .notNull()
    .references(() => appointments.id, { onDelete: "cascade" }),
  fromStatus: appointmentStatusEnum("from_status"),
  toStatus: appointmentStatusEnum("to_status").notNull(),
  reason: text("reason"),
  changedByStaffId: uuid("changed_by_staff_id").references(() => staffUsers.id, { onDelete: "set null" }),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blockouts = pgTable("blockouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatoryId: uuid("operatory_id").references(() => operatories.id, { onDelete: "cascade" }),
  providerId: uuid("provider_id").references(() => providers.id, { onDelete: "cascade" }),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const waitlistEntries = pgTable("waitlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  appointmentTypeId: uuid("appointment_type_id").references(() => appointmentTypes.id, { onDelete: "set null" }),
  providerId: uuid("provider_id").references(() => providers.id, { onDelete: "set null" }),
  preferredFrom: date("preferred_from"),
  preferredTo: date("preferred_to"),
  asap: boolean("asap").notNull().default(false),
  note: text("note"),
  status: text("status").notNull().default("open"), // open | filled | cancelled
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consents = pgTable("consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // privacy | sms | email | treatment | data_sharing
  version: text("version").notNull().default("1"),
  granted: boolean("granted").notNull(),
  locale: localeEnum("locale").notNull().default("en"),
  ip: text("ip"),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Immutable audit log of PHI access/mutations. Never updated/deleted. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: text("actor_type").notNull(), // staff | patient | system
    actorId: text("actor_id"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byEntity: index("audit_logs_entity_idx").on(t.entityType, t.entityId) }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    channel: notificationChannelEnum("channel").notNull(),
    type: notificationTypeEnum("type").notNull(),
    status: notificationStatusEnum("status").notNull().default("queued"),
    locale: localeEnum("locale").notNull().default("en"),
    subject: text("subject"),
    body: text("body").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    providerRef: text("provider_ref"),
    dedupeKey: text("dedupe_key"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byPatient: index("notifications_patient_idx").on(t.patientId),
    byStatus: index("notifications_status_idx").on(t.status),
    byDedupe: uniqueIndex("notifications_dedupe_uidx").on(t.dedupeKey),
  }),
);

/** Hashed one-time passcodes for patient portal phone verification. */
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byPhone: index("otp_codes_phone_idx").on(t.phone) }),
);

/** Short-lived slot holds so two patients can't grab the same slot mid-booking. */
export const slotHolds = pgTable(
  "slot_holds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operatoryId: uuid("operatory_id").references(() => operatories.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id").references(() => providers.id, { onDelete: "cascade" }),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    heldUntil: timestamp("held_until", { withTimezone: true }).notNull(),
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byStart: index("slot_holds_start_idx").on(t.startAt) }),
);
