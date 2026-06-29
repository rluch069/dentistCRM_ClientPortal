import type { PaymentMethod } from "@dentalos/core/constants";

// ── SMS ──────────────────────────────────────────────────────────────────────
export interface SendSmsInput {
  to: string; // E.164
  body: string;
  sender?: string;
}
export interface SendSmsResult {
  id: string;
  status: "sent" | "queued" | "failed";
  providerRef?: string;
  error?: string;
}
export interface SmsProvider {
  readonly name: string;
  send(input: SendSmsInput): Promise<SendSmsResult>;
}

// ── Email ────────────────────────────────────────────────────────────────────
export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}
export interface SendEmailResult {
  id: string;
  status: "sent" | "queued" | "failed";
  providerRef?: string;
  error?: string;
}
export interface EmailProvider {
  readonly name: string;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

// ── Payments ─────────────────────────────────────────────────────────────────
export interface ChargeInput {
  amountCents: number;
  currency: string; // "MUR"
  method: PaymentMethod;
  reference: string;
  description?: string;
  metadata?: Record<string, unknown>;
  /** Where to return the patient after a hosted checkout (real gateways). */
  returnUrl?: string;
}
export interface ChargeResult {
  id: string;
  status: "captured" | "pending" | "failed";
  providerRef?: string;
  /** Present when the gateway needs a hosted-checkout / QR redirect. */
  redirectUrl?: string;
  error?: string;
}
export interface PaymentProvider {
  readonly name: string;
  /** Supported methods for capability checks in the UI. */
  readonly methods: PaymentMethod[];
  charge(input: ChargeInput): Promise<ChargeResult>;
}

// ── Storage ──────────────────────────────────────────────────────────────────
export interface PutObjectInput {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
}
export interface StorageProvider {
  readonly name: string;
  put(input: PutObjectInput): Promise<{ key: string }>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export interface Providers {
  sms: SmsProvider;
  email: EmailProvider;
  payment: PaymentProvider;
  storage: StorageProvider;
}
