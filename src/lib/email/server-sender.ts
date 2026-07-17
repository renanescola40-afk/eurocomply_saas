import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import { reportError } from '@/lib/observability/report-error';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import type { EmailTemplateKey } from '@/lib/email/templates';
import {
  classifyProviderFailure,
  providerConfigurationFailure,
  providerFailureContext,
  type ProviderFailureError,
  type ProviderFailureSummary,
} from '@/server/providers/failure';

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  template?: EmailTemplateKey;
  organizationId?: string | null;
  userId?: string | null;
  unsubscribeUrl?: string | null;
  idempotencyKey?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export type SendEmailResult = {
  sent: boolean;
  provider: 'resend' | 'console';
  id?: string;
  status: 'sent' | 'skipped' | 'failed';
  attempts: number;
  failure?: ProviderFailureSummary;
};

type EmailLogStatus = 'queued' | 'sent' | 'failed' | 'skipped';

type ResendEmailResponse = {
  id?: string;
  error?: {
    message?: string;
    name?: string;
  };
};

type EmailLogPayload = {
  id?: string;
  recipient: string;
  recipient_hash: string;
  template: EmailTemplateKey;
  status: EmailLogStatus;
  provider: 'resend' | 'console';
  provider_id: string | null;
  attempts: number;
  subject: string;
  organization_id: string | null;
  user_id: string | null;
  idempotency_key: string | null;
  error: string | null;
  metadata: Record<string, string | number | boolean | null | undefined>;
  updated_at: string;
  sent_at: string | null;
};

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const RESEND_REQUEST_TIMEOUT_MS = 10_000;
const RESEND_RESPONSE_MAX_BYTES = 64 * 1024;
const RESEND_IDEMPOTENCY_KEY_MAX_LENGTH = 256;
const DEFAULT_MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 350;
const MAX_BACKOFF_MS = 3_000;
const EMAIL_HASH_PEPPER_ENV = 'EMAIL_LOG_HASH_PEPPER';

const SENSITIVE_VALUE_PATTERNS = [
  /\b(?:sk|rk|pk|whsec|clerk|sess|cs|orginv|ticket)_[A-Za-z0-9_=-]{12,}\b/gi,
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\b[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{24,}\b/g,
  /(?:token|secret|api[_-]?key|password|otp|code)=([^&\s]{6,})/gi,
];

const SENSITIVE_REPLACEMENT = '[redacted]';

function inferLegacyTemplate(input: Pick<SendEmailInput, 'template' | 'subject'>): EmailTemplateKey {
  if (input.template) return input.template;

  const subject = input.subject.toLowerCase();

  if (subject.includes('payment issue')) return 'invoice_failed';
  if (subject.includes('trial')) return 'trial_upgrade';
  if (subject.includes('invitation')) return 'member_invited';
  if (subject.includes('document review')) return 'document_expiring';
  if (subject.includes('vendor review')) return 'vendor_review';
  if (subject.includes('export')) return 'export_ready';
  if (subject.includes('security alert')) return 'security_alert';
  if (subject.includes('ready in risck comply') || subject.includes('welcome')) return 'welcome_onboarding';

  return 'security_alert';
}

function getTemplate(input: Pick<SendEmailInput, 'template' | 'subject'>) {
  return inferLegacyTemplate(input);
}

function getDefaultFromAddress() {
  return process.env.EMAIL_FROM ?? 'RISCK COMPLY <no-reply@risckcomply.app>';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBackoffDelay(attempt: number) {
  const exponentialDelay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * 125);
  return exponentialDelay + jitter;
}

function withResendIdempotencyKey(input: SendEmailInput): SendEmailInput & { idempotencyKey: string } {
  const providedKey = input.idempotencyKey?.trim();

  if (providedKey && providedKey.length > RESEND_IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new Error('Email idempotency key exceeds the Resend 256-character limit.');
  }

  return {
    ...input,
    idempotencyKey: providedKey || `email/${randomUUID()}`,
  };
}

function normalizeRecipients(to: string) {
  return to
    .split(',')
    .map((recipient) => recipient.trim().toLowerCase())
    .filter(Boolean);
}

function hashRecipient(recipient: string) {
  const pepper = process.env[EMAIL_HASH_PEPPER_ENV] ?? process.env.AUDIT_CHAIN_SIGNING_SECRET ?? 'risck-comply-email-log';
  return createHash('sha256').update(`${pepper}:${recipient.toLowerCase()}`).digest('hex');
}

export function redactEmailSecrets(value: string | null | undefined) {
  if (typeof value !== 'string' || value.length === 0) return '';

  return SENSITIVE_VALUE_PATTERNS.reduce((current, pattern) => current.replace(pattern, SENSITIVE_REPLACEMENT), value);
}

function assertNoSensitiveContent(input: SendEmailInput) {
  const combined = [input.subject, input.html, input.text ?? '', input.unsubscribeUrl ?? ''].join('\n');
  const redacted = redactEmailSecrets(combined);

  if (redacted !== combined) {
    throw new Error(`Email template ${getTemplate(input)} contains a sensitive token-like value and was blocked before delivery.`);
  }
}

function buildListUnsubscribeHeaders(input: SendEmailInput) {
  if (!input.unsubscribeUrl) return undefined;

  return {
    'List-Unsubscribe': `<${input.unsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

async function readBoundedResendResponse(response: Response): Promise<ResendEmailResponse> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > RESEND_RESPONSE_MAX_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error('provider_response_too_large');
  }

  if (!response.body) return {};

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > RESEND_RESPONSE_MAX_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error('provider_response_too_large');
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(body);
    return text.length > 0 ? (JSON.parse(text) as ResendEmailResponse) : {};
  } catch {
    return {};
  }
}

function buildEmailLogPayload(input: {
  id?: string;
  email: SendEmailInput;
  status: EmailLogStatus;
  provider: 'resend' | 'console';
  providerId?: string | null;
  attempts: number;
  error?: string | null;
}): EmailLogPayload {
  const recipients = normalizeRecipients(input.email.to);
  const primaryRecipient = recipients[0] ?? input.email.to.toLowerCase();
  const template = getTemplate(input.email);

  return {
    id: input.id,
    recipient: primaryRecipient,
    recipient_hash: hashRecipient(primaryRecipient),
    template,
    status: input.status,
    provider: input.provider,
    provider_id: input.providerId ?? null,
    attempts: input.attempts,
    subject: redactEmailSecrets(input.email.subject).slice(0, 300),
    organization_id: input.email.organizationId ?? null,
    user_id: input.email.userId ?? null,
    idempotency_key: input.email.idempotencyKey ?? null,
    error: input.error ? redactEmailSecrets(input.error).slice(0, 500) : null,
    metadata: input.email.metadata ?? {},
    updated_at: new Date().toISOString(),
    sent_at: input.status === 'sent' ? new Date().toISOString() : null,
  };
}

async function writeEmailLog(input: {
  id?: string;
  email: SendEmailInput;
  status: EmailLogStatus;
  provider: 'resend' | 'console';
  providerId?: string | null;
  attempts: number;
  error?: string | null;
}) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return;

  const payload = buildEmailLogPayload(input);

  const operation = payload.idempotency_key
    ? supabase.from('email_delivery_logs').upsert(payload, { onConflict: 'idempotency_key' })
    : supabase.from('email_delivery_logs').insert(payload);

  const { error } = await operation;

  if (error) {
    reportError(error, {
      area: 'email_delivery_log_write',
      template: payload.template,
      status: input.status,
    });
  }
}

async function sendWithResend(input: SendEmailInput, apiKey: string, from: string) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: buildListUnsubscribeHeaders(input),
    }),
    signal: AbortSignal.timeout(RESEND_REQUEST_TIMEOUT_MS),
  });

  const data = await readBoundedResendResponse(response);

  if (!response.ok) {
    throw classifyProviderFailure('resend', 'send_email', {
      name: data.error?.name ?? 'resend_error',
      code: data.error?.name ?? `status_${response.status}`,
      status: response.status,
    });
  }

  return data.id;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = input.from ?? getDefaultFromAddress();
  const maxAttempts = Number(process.env.EMAIL_MAX_SEND_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS);
  const attemptsToRun = Number.isSafeInteger(maxAttempts) && maxAttempts > 0 ? Math.min(maxAttempts, 5) : DEFAULT_MAX_ATTEMPTS;
  const template = getTemplate(input);

  assertNoSensitiveContent(input);

  const deliveryInput = apiKey ? withResendIdempotencyKey(input) : input;

  await writeEmailLog({
    email: deliveryInput,
    status: apiKey ? 'queued' : 'skipped',
    provider: apiKey ? 'resend' : 'console',
    attempts: 0,
  });

  if (!apiKey) {
    const configurationFailure = providerConfigurationFailure('resend', 'send_email', 'missing_api_key');
    console.info('[RISCK COMPLY provider skipped]', {
      event: 'transactional_delivery_provider_missing',
      template,
      ...providerFailureContext(configurationFailure),
    });

    await writeEmailLog({
      email: deliveryInput,
      status: 'skipped',
      provider: 'console',
      attempts: 0,
      error: `${configurationFailure.kind}:${configurationFailure.providerCode}`,
    });

    return {
      sent: false,
      provider: 'console',
      status: 'skipped',
      attempts: 0,
      failure: configurationFailure.toSafeSummary(),
    };
  }

  let lastFailure: ProviderFailureError | null = null;
  let attemptsUsed = 0;

  for (let attempt = 1; attempt <= attemptsToRun; attempt += 1) {
    attemptsUsed = attempt;
    try {
      const providerId = await sendWithResend(deliveryInput, apiKey, from);

      await writeEmailLog({
        email: deliveryInput,
        status: 'sent',
        provider: 'resend',
        providerId,
        attempts: attempt,
      });
      return { sent: true, provider: 'resend', id: providerId, status: 'sent', attempts: attempt };
    } catch (error) {
      const providerFailure = classifyProviderFailure('resend', 'send_email', error);
      lastFailure = providerFailure;

      reportError(providerFailure, {
        area: 'email_send',
        template,
        attempt,
        attemptsToRun,
        ...providerFailureContext(providerFailure),
      });

      if (!providerFailure.retryable || attempt >= attemptsToRun) break;
      await sleep(getBackoffDelay(attempt));
    }
  }

  const providerFailure = lastFailure ?? classifyProviderFailure('resend', 'send_email', new Error('unknown_provider_failure'));

  await writeEmailLog({
    email: deliveryInput,
    status: 'failed',
    provider: 'resend',
    attempts: attemptsUsed,
    error: `${providerFailure.kind}:${providerFailure.providerCode}`,
  });

  throw providerFailure;
}
