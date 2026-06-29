import { z } from "zod";
import {
  STAFF_ROLES,
  GENDERS,
  LOCALES,
  APPOINTMENT_SCOPES,
  APPOINTMENT_STATUSES,
  PAYMENT_METHODS,
  PROCEDURE_STATUSES,
} from "./constants/enums";
import { TOOTH_SURFACES } from "./constants/teeth";
import { normalizeMuPhone } from "./constants/locale";
import { isValidSlug } from "./slug";

export const muPhoneSchema = z
  .string()
  .min(7)
  .transform((v, ctx) => {
    const normalized = normalizeMuPhone(v);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid Mauritius phone number" });
      return z.NEVER;
    }
    return normalized;
  });

export const localeSchema = z.enum(LOCALES);

// ── Clinic onboarding (control plane) ────────────────────────────────────────
export const clinicOnboardingSchema = z.object({
  clinicName: z.string().min(2).max(80),
  slug: z
    .string()
    .min(3)
    .max(40)
    .refine(isValidSlug, "Slug must be 3–40 chars, lowercase letters/numbers/hyphens, and not reserved"),
  ownerName: z.string().min(2).max(80),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8).max(128),
  locale: localeSchema.default("en"),
  timezone: z.string().default("Indian/Mauritius"),
  phone: muPhoneSchema.optional(),
});
export type ClinicOnboardingInput = z.infer<typeof clinicOnboardingSchema>;

// ── Patient ──────────────────────────────────────────────────────────────────
export const insurancePolicySchema = z.object({
  insurerName: z.string().min(1).max(120),
  policyNumber: z.string().max(80).optional(),
  memberName: z.string().max(120).optional(),
  estimatedCoveragePct: z.number().int().min(0).max(100).optional(),
});

export const createPatientSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  dateOfBirth: z.string().date().optional(), // ISO yyyy-mm-dd
  gender: z.enum(GENDERS).default("unspecified"),
  phone: muPhoneSchema.optional(),
  email: z.string().email().optional(),
  locale: localeSchema.default("en"),
  address: z.string().max(240).optional(),
  medicalHistory: z.string().max(4000).optional(),
  allergies: z.string().max(1000).optional(),
  householdId: z.string().uuid().optional(),
  insurancePolicies: z.array(insurancePolicySchema).max(3).default([]),
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = createPatientSchema.partial();

// ── Appointment types ────────────────────────────────────────────────────────
export const appointmentTypeSchema = z.object({
  name: z.string().min(1).max(60),
  durationMinutes: z.number().int().min(5).max(480),
  scope: z.enum(APPOINTMENT_SCOPES).default("all"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2563eb"),
  recallIntervalMonths: z.number().int().min(1).max(60).nullable().default(null),
});

// ── Appointments (practice app) ──────────────────────────────────────────────
export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  operatoryId: z.string().uuid(),
  appointmentTypeId: z.string().uuid(),
  startAt: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(480),
  note: z.string().max(1000).optional(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  startAt: z.string().datetime(),
  operatoryId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
});

export const changeAppointmentStatusSchema = z.object({
  appointmentId: z.string().uuid(),
  status: z.enum(APPOINTMENT_STATUSES),
  reason: z.string().max(280).optional(),
});

// ── Booking (patient portal) ─────────────────────────────────────────────────
export const requestOtpSchema = z.object({
  phone: muPhoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: muPhoneSchema,
  code: z.string().length(6).regex(/^\d{6}$/),
});

export const availabilityQuerySchema = z.object({
  appointmentTypeId: z.string().uuid(),
  providerId: z.string().uuid().nullable().optional(), // null => any provider
  fromDate: z.string().date(),
  days: z.number().int().min(1).max(30).default(14),
});

export const bookingRequestSchema = z.object({
  appointmentTypeId: z.string().uuid(),
  providerId: z.string().uuid().nullable().optional(),
  operatoryId: z.string().uuid().optional(),
  startAt: z.string().datetime(),
  // New-patient details (when the verified phone has no patient record yet).
  newPatient: z
    .object({
      firstName: z.string().min(1).max(80),
      lastName: z.string().min(1).max(80),
      email: z.string().email().optional(),
      locale: localeSchema.default("en"),
    })
    .optional(),
  note: z.string().max(500).optional(),
});
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

// ── Clinical ─────────────────────────────────────────────────────────────────
export const toothSurfaceSchema = z.enum(TOOTH_SURFACES);

export const procedureSchema = z.object({
  patientId: z.string().uuid(),
  code: z.string().min(1).max(40),
  toothFdi: z.number().int().optional(),
  surfaces: z.array(toothSurfaceSchema).max(5).default([]),
  status: z.enum(PROCEDURE_STATUSES).default("planned"),
  feeCents: z.number().int().min(0),
  providerId: z.string().uuid().optional(),
  diagnosisId: z.string().uuid().optional(),
  note: z.string().max(1000).optional(),
});

export const clinicalNoteSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  subjective: z.string().max(4000).optional(),
  objective: z.string().max(4000).optional(),
  assessment: z.string().max(4000).optional(),
  plan: z.string().max(4000).optional(),
});

export const prescriptionSchema = z.object({
  patientId: z.string().uuid(),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        sig: z.string().min(1).max(280),
        quantity: z.string().max(40).optional(),
      }),
    )
    .min(1),
  note: z.string().max(1000).optional(),
});

// ── Payments ─────────────────────────────────────────────────────────────────
export const recordPaymentSchema = z.object({
  patientId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  amountCents: z.number().int().min(1),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().max(120).optional(),
});

export const staffRoleSchema = z.enum(STAFF_ROLES);
