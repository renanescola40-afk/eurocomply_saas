import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const API_KEY_PREFIX = 'rc_live_';
const SCIM_PREFIX = 'scim_';
const MAX_WEBHOOK_AGE_SECONDS = 300;

export type IntegrationScope =
  | 'inventory:read'
  | 'inventory:write'
  | 'assessments:read'
  | 'assessments:write'
  | 'evidence:read'
  | 'evidence:write'
  | 'reports:read'
  | 'webhooks:manage'
  | 'users:provision';

export interface IssuedSecret {
  plaintext: string;
  prefix: string;
  sha256: string;
}

export interface WebhookVerificationInput {
  body: string;
  signature: string;
  timestamp: string;
  secret: string;
  now?: Date;
  maximumAgeSeconds?: number;
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function safeHexEqual(left: string, right: string): boolean {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right) || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function issueSecret(namespace: typeof API_KEY_PREFIX | typeof SCIM_PREFIX): IssuedSecret {
  const publicPart = randomBytes(6).toString('base64url').slice(0, 8);
  const privatePart = randomBytes(32).toString('base64url');
  const prefix = `${namespace}${publicPart}`;
  const plaintext = `${prefix}.${privatePart}`;
  return { plaintext, prefix, sha256: sha256(plaintext) };
}

export function issueEnterpriseApiKey(): IssuedSecret {
  return issueSecret(API_KEY_PREFIX);
}

export function issueScimToken(): IssuedSecret {
  return issueSecret(SCIM_PREFIX);
}

export function verifyStoredSecret(candidate: string, expectedSha256: string): boolean {
  if (!candidate || !/^[a-f0-9]{64}$/i.test(expectedSha256)) return false;
  return safeHexEqual(sha256(candidate), expectedSha256.toLowerCase());
}

export function hashNetworkIdentifier(value: string, pepper: string): string {
  if (!value || pepper.length < 32) throw new Error('NETWORK_HASH_PEPPER_INVALID');
  return createHmac('sha256', pepper).update(value, 'utf8').digest('hex');
}

export function assertScopesAllowed(requested: string[], allowed: readonly IntegrationScope[]): IntegrationScope[] {
  const unique = [...new Set(requested)];
  if (unique.length === 0 || unique.length > 32) throw new Error('INTEGRATION_SCOPES_INVALID');
  const allowedSet = new Set<string>(allowed);
  if (unique.some((scope) => !allowedSet.has(scope))) throw new Error('INTEGRATION_SCOPE_FORBIDDEN');
  return unique as IntegrationScope[];
}

export function signWebhook(body: string, timestamp: string, secret: string): string {
  if (!/^\d{10,13}$/.test(timestamp)) throw new Error('WEBHOOK_TIMESTAMP_INVALID');
  if (secret.length < 32) throw new Error('WEBHOOK_SECRET_INVALID');
  return createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex');
}

export function verifyWebhook(input: WebhookVerificationInput): boolean {
  const maximumAgeSeconds = input.maximumAgeSeconds ?? MAX_WEBHOOK_AGE_SECONDS;
  if (maximumAgeSeconds < 1 || maximumAgeSeconds > 900) return false;
  if (!/^\d{10,13}$/.test(input.timestamp) || !/^[a-f0-9]{64}$/i.test(input.signature)) return false;

  const numeric = Number(input.timestamp);
  const timestampMs = input.timestamp.length === 10 ? numeric * 1000 : numeric;
  const ageSeconds = Math.abs((input.now ?? new Date()).getTime() - timestampMs) / 1000;
  if (!Number.isFinite(ageSeconds) || ageSeconds > maximumAgeSeconds) return false;

  const expected = signWebhook(input.body, input.timestamp, input.secret);
  return safeHexEqual(expected, input.signature.toLowerCase());
}

export function computeRetryAt(attempt: number, now = new Date()): Date {
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > 20) throw new Error('WEBHOOK_ATTEMPT_INVALID');
  const baseSeconds = Math.min(3600, 2 ** Math.min(attempt, 12));
  const deterministicJitter = attempt * 137 % 1000;
  return new Date(now.getTime() + baseSeconds * 1000 + deterministicJitter);
}

export function sanitizeOutboundWebhookPayload(payload: unknown): unknown {
  const blocked = /token|secret|password|authorization|cookie|session|email|phone|address/i;
  const walk = (value: unknown, depth: number): unknown => {
    if (depth > 8) throw new Error('WEBHOOK_PAYLOAD_TOO_DEEP');
    if (Array.isArray(value)) return value.slice(0, 100).map((item) => walk(item, depth + 1));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([key]) => !blocked.test(key))
          .slice(0, 100)
          .map(([key, item]) => [key, walk(item, depth + 1)]),
      );
    }
    if (typeof value === 'string') return value.slice(0, 4096);
    return value;
  };
  return walk(payload, 0);
}
