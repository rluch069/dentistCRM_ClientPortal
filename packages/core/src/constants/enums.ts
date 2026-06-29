/**
 * Canonical enums shared across the platform. Defined as `as const` tuples so
 * they can drive both TypeScript union types and Drizzle pgEnum / Zod enums.
 */

// ── Locale ───────────────────────────────────────────────────────────────────
export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

// ── Staff roles (within a clinic organization) ───────────────────────────────
export const STAFF_ROLES = [
  "owner",
  "dentist",
  "hygienist",
  "assistant",
  "receptionist",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

// Roles that deliver clinical care and can appear as a scheduling "provider".
export const PROVIDER_ROLES: StaffRole[] = ["owner", "dentist", "hygienist"];

// ── Appointment status pipeline ──────────────────────────────────────────────
// booked → confirmed → arrived → seated → completed
// branches: no_show, cancelled, broken (late cancellation)
export const APPOINTMENT_STATUSES = [
  "booked",
  "confirmed",
  "arrived",
  "seated",
  "completed",
  "no_show",
  "cancelled",
  "broken",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "booked",
  "confirmed",
  "arrived",
  "seated",
];

export const TERMINAL_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "completed",
  "no_show",
  "cancelled",
  "broken",
];

/** Allowed forward transitions for the status pipeline. */
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ["confirmed", "arrived", "cancelled", "no_show", "broken"],
  confirmed: ["arrived", "cancelled", "no_show", "broken"],
  arrived: ["seated", "cancelled", "no_show"],
  seated: ["completed", "cancelled"],
  completed: [],
  no_show: ["booked"],
  cancelled: ["booked"],
  broken: ["booked"],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return APPOINTMENT_TRANSITIONS[from].includes(to);
}

// ── Appointment booking scope (new vs existing patients) ─────────────────────
export const APPOINTMENT_SCOPES = ["new", "existing", "all"] as const;
export type AppointmentScope = (typeof APPOINTMENT_SCOPES)[number];

// ── Gender ───────────────────────────────────────────────────────────────────
export const GENDERS = ["male", "female", "other", "unspecified"] as const;
export type Gender = (typeof GENDERS)[number];

// ── Notification channels & types ────────────────────────────────────────────
export const NOTIFICATION_CHANNELS = ["sms", "email", "in_app"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_TYPES = [
  "appointment_booked",
  "appointment_confirmation_request",
  "appointment_reminder",
  "appointment_rescheduled",
  "appointment_cancelled",
  "recall_due",
  "payment_receipt",
  "payment_due",
  "treatment_plan_shared",
  "otp_code",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_STATUSES = [
  "queued",
  "sent",
  "delivered",
  "failed",
  "read",
  "suppressed",
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

// ── Payments ─────────────────────────────────────────────────────────────────
export const PAYMENT_METHODS = [
  "cash",
  "card",
  "mcb_juice",
  "myt_money",
  "maucas_qr",
  "bank_transfer",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "captured",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// ── Clinical ─────────────────────────────────────────────────────────────────
export const PROCEDURE_STATUSES = [
  "existing", // pre-existing work observed
  "condition", // a condition/finding (e.g. caries) rather than a treatment
  "planned", // treatment-planned
  "completed", // performed
  "deleted",
] as const;
export type ProcedureStatus = (typeof PROCEDURE_STATUSES)[number];

export const TREATMENT_PLAN_STATUSES = ["draft", "proposed", "accepted", "rejected", "completed"] as const;
export type TreatmentPlanStatus = (typeof TREATMENT_PLAN_STATUSES)[number];

// ── Billing ──────────────────────────────────────────────────────────────────
export const INVOICE_STATUSES = ["draft", "issued", "partially_paid", "paid", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const LEDGER_ENTRY_TYPES = ["charge", "payment", "adjustment", "refund", "writeoff"] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

// ── Tenant lifecycle (control plane) ─────────────────────────────────────────
export const TENANT_STATUSES = ["provisioning", "active", "suspended", "deprovisioning"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const SUBSCRIPTION_PLANS = ["trial", "starter", "pro", "clinic"] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];
