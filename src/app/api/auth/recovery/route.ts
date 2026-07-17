import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';

import { locales, type Locale } from '@/lib/i18n/routing';
import { reportError } from '@/lib/observability/report-error';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { readBoundedJsonRequest, ValidationError } from '@/lib/security/validate';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  classifyProviderFailure,
  providerFailureContext,
} from '@/server/providers/failure';
import { noStoreJson } from '@/server/security/no-store';
import { assertTrustedOrigin } from '@/server/security/origin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RECOVERY_BODY_MAX_BYTES = 4 * 1024;
const RECOVERY_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RECOVERY_RATE_LIMIT_MAX = 3;
const RECOVERY_ROUTE = '/api/auth/recovery';
const RECOVERY_ACTION = 'account_recovery_request';
const GENERIC_RECOVERY_MESSAGE =
  'If an account exists for that email, a secure recovery link will be sent.';

type RecoveryPayload = {
  email?: unknown;
  locale?: unknown;
};

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizeLocale(value: unknown): Locale {
  const locale = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return locales.includes(locale as Locale) ? (locale as Locale) : 'en';
}

function privacySafeRecoveryKey(email: string) {
  return createHash('sha256').update(email).digest('hex');
}

async function enforceRecoveryRateLimit(request: NextRequest, email: string) {
  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const result = await checkDistributedRateLimit({
    userId: null,
    organizationId: null,
    ip: forwardedIp,
    userAgent: request.headers.get('user-agent'),
    action: RECOVERY_ACTION,
    route: RECOVERY_ROUTE,
    key: `account_recovery:${privacySafeRecoveryKey(email)}:${forwardedIp}`,
    policy: 'password-reset',
    limit: RECOVERY_RATE_LIMIT_MAX,
    windowMs: RECOVERY_RATE_LIMIT_WINDOW_MS,
    failureMode: 'fail-closed',
  });

  return result.allowed
    ? null
    : rateLimitResponse(result, 'Too many recovery requests. Please try again later.');
}

async function readPayload(request: NextRequest): Promise<RecoveryPayload | null> {
  try {
    const payload = await readBoundedJsonRequest<unknown>(request, {
      maxBytes: RECOVERY_BODY_MAX_BYTES,
      requireJsonContentType: true,
    });

    return payload && typeof payload === 'object' ? (payload as RecoveryPayload) : null;
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      reportError(new Error('Account recovery request body could not be read'), {
        area: 'account_recovery_request_body',
      });
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  const originDenied = assertTrustedOrigin(request);
  if (originDenied) return originDenied;

  const payload = await readPayload(request);
  const email = normalizeEmail(payload?.email);
  const locale = normalizeLocale(payload?.locale);

  if (!email) {
    return noStoreJson({ error: 'invalid_recovery_request' }, { status: 400 });
  }

  const rateLimited = await enforceRecoveryRateLimit(request, email);
  if (rateLimited) return rateLimited;

  const redirectTo = new URL(`/${locale}/reset-password`, request.nextUrl.origin).toString();

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      throw classifyProviderFailure('supabase', 'password_recovery_request', error);
    }
  } catch (error) {
    const providerFailure = classifyProviderFailure('supabase', 'password_recovery_request', error);
    reportError(providerFailure, {
      area: 'account_recovery_provider',
      ...providerFailureContext(providerFailure),
    });
    return noStoreJson({ error: 'account_recovery_unavailable' }, { status: 503 });
  }

  return noStoreJson(
    {
      ok: true,
      message: GENERIC_RECOVERY_MESSAGE,
    },
    { status: 202 },
  );
}
