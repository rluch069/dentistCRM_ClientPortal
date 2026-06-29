import { pgEnum } from "drizzle-orm/pg-core";
import {
  STAFF_ROLES,
  GENDERS,
  LOCALES,
  APPOINTMENT_SCOPES,
  APPOINTMENT_STATUSES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PROCEDURE_STATUSES,
  TREATMENT_PLAN_STATUSES,
  INVOICE_STATUSES,
  LEDGER_ENTRY_TYPES,
} from "@dentalos/core/constants";

export const staffRoleEnum = pgEnum("staff_role", STAFF_ROLES);
export const genderEnum = pgEnum("gender", GENDERS);
export const localeEnum = pgEnum("locale", LOCALES);
export const appointmentScopeEnum = pgEnum("appointment_scope", APPOINTMENT_SCOPES);
export const appointmentStatusEnum = pgEnum("appointment_status", APPOINTMENT_STATUSES);
export const notificationChannelEnum = pgEnum("notification_channel", NOTIFICATION_CHANNELS);
export const notificationTypeEnum = pgEnum("notification_type", NOTIFICATION_TYPES);
export const notificationStatusEnum = pgEnum("notification_status", NOTIFICATION_STATUSES);
export const paymentMethodEnum = pgEnum("payment_method", PAYMENT_METHODS);
export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUSES);
export const procedureStatusEnum = pgEnum("procedure_status", PROCEDURE_STATUSES);
export const treatmentPlanStatusEnum = pgEnum("treatment_plan_status", TREATMENT_PLAN_STATUSES);
export const invoiceStatusEnum = pgEnum("invoice_status", INVOICE_STATUSES);
export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", LEDGER_ENTRY_TYPES);
