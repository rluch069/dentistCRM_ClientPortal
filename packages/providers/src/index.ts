import type { Providers, SmsProvider, EmailProvider, PaymentProvider, StorageProvider } from "./types";
import { MockSmsProvider, MockEmailProvider, MockPaymentProvider, LocalStorageProvider } from "./mock";

export * from "./types";
export { getMockOutbox, clearMockOutbox, type OutboxEntry } from "./mock";
export { MockSmsProvider, MockEmailProvider, MockPaymentProvider, LocalStorageProvider } from "./mock";

export interface ProvidersConfig {
  sms?: string;
  email?: string;
  payment?: string;
  storage?: string;
}

function pickSms(kind: string): SmsProvider {
  switch (kind) {
    case "mock":
      return new MockSmsProvider();
    default:
      throw new Error(`SMS provider "${kind}" not implemented. Use PROVIDER_SMS=mock for dev.`);
  }
}
function pickEmail(kind: string): EmailProvider {
  switch (kind) {
    case "mock":
      return new MockEmailProvider();
    default:
      throw new Error(`Email provider "${kind}" not implemented. Use PROVIDER_EMAIL=mock for dev.`);
  }
}
function pickPayment(kind: string): PaymentProvider {
  switch (kind) {
    case "mock":
      return new MockPaymentProvider();
    default:
      throw new Error(`Payment provider "${kind}" not implemented. Use PROVIDER_PAYMENT=mock for dev.`);
  }
}
function pickStorage(kind: string): StorageProvider {
  switch (kind) {
    case "local":
      return new LocalStorageProvider();
    default:
      throw new Error(`Storage provider "${kind}" not implemented. Use PROVIDER_STORAGE=local for dev.`);
  }
}

// Process-global singleton so we don't recreate providers per request.
const globalForProviders = globalThis as unknown as { __dentalosProviders?: Providers };

export function getProviders(config: ProvidersConfig = {}): Providers {
  if (globalForProviders.__dentalosProviders) return globalForProviders.__dentalosProviders;
  const providers: Providers = {
    sms: pickSms(config.sms ?? process.env.PROVIDER_SMS ?? "mock"),
    email: pickEmail(config.email ?? process.env.PROVIDER_EMAIL ?? "mock"),
    payment: pickPayment(config.payment ?? process.env.PROVIDER_PAYMENT ?? "mock"),
    storage: pickStorage(config.storage ?? process.env.PROVIDER_STORAGE ?? "local"),
  };
  globalForProviders.__dentalosProviders = providers;
  return providers;
}
