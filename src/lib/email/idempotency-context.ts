import 'server-only';

import { AsyncLocalStorage } from 'node:async_hooks';

type EmailIdempotencyContext = {
  key: string;
};

const emailIdempotencyStorage = new AsyncLocalStorage<EmailIdempotencyContext>();

export function runWithEmailIdempotencyContext<T>(key: string, operation: () => T): T {
  const normalizedKey = key.trim();

  if (!normalizedKey) {
    throw new Error('Email idempotency context key is required');
  }

  return emailIdempotencyStorage.run({ key: normalizedKey }, operation);
}

export function getEmailIdempotencyContextKey() {
  return emailIdempotencyStorage.getStore()?.key ?? null;
}
