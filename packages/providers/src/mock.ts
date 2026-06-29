import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import type {
  SmsProvider,
  EmailProvider,
  PaymentProvider,
  StorageProvider,
  SendSmsInput,
  SendSmsResult,
  SendEmailInput,
  SendEmailResult,
  ChargeInput,
  ChargeResult,
  PutObjectInput,
} from "./types";
import { PAYMENT_METHODS } from "@dentalos/core/constants";

/** Shared in-memory outbox so dev tooling/tests can inspect what was "sent". */
export interface OutboxEntry {
  kind: "sms" | "email";
  to: string;
  subject?: string;
  body: string;
  at: string;
}
const outbox: OutboxEntry[] = [];
export function getMockOutbox(): readonly OutboxEntry[] {
  return outbox;
}
export function clearMockOutbox(): void {
  outbox.length = 0;
}

export class MockSmsProvider implements SmsProvider {
  readonly name = "mock-sms";
  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const id = randomUUID();
    outbox.push({ kind: "sms", to: input.to, body: input.body, at: nowIso() });
    // Loud log so dev can read OTPs / reminders from the worker/app console.
    console.log(`\n📱 [mock-sms] → ${input.to}\n   ${input.body}\n`);
    return { id, status: "sent", providerRef: `mock_${id}` };
  }
}

export class MockEmailProvider implements EmailProvider {
  readonly name = "mock-email";
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const id = randomUUID();
    outbox.push({ kind: "email", to: input.to, subject: input.subject, body: input.text ?? input.html, at: nowIso() });
    console.log(`\n✉️  [mock-email] → ${input.to}  «${input.subject}»\n   ${(input.text ?? stripHtml(input.html)).slice(0, 200)}\n`);
    return { id, status: "sent", providerRef: `mock_${id}` };
  }
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock-payment";
  readonly methods = [...PAYMENT_METHODS];
  async charge(input: ChargeInput): Promise<ChargeResult> {
    const id = randomUUID();
    console.log(`\n💳 [mock-payment] ${input.method} captured ${input.currency} ${(input.amountCents / 100).toFixed(2)} (ref=${input.reference})\n`);
    return { id, status: "captured", providerRef: `mockpay_${id}` };
  }
}

/** Local-disk storage for dev. Writes under <cwd>/.storage. */
export class LocalStorageProvider implements StorageProvider {
  readonly name = "local-storage";
  constructor(private readonly root: string = join(process.cwd(), ".storage")) {}
  async put(input: PutObjectInput): Promise<{ key: string }> {
    const path = join(this.root, input.key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.body);
    return { key: input.key };
  }
  async getSignedUrl(key: string): Promise<string> {
    // Dev: served by the app's /_storage route (signing is a no-op locally).
    return `/_storage/${key}`;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
