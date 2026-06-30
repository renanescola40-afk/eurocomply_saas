import type { NextRequest } from 'next/server';

import { sendPrelaunchWaitlistEmail } from '@/lib/email/prelaunch-waitlist';
import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { readBoundedJsonRequest, ValidationError } from '@/lib/security/validate';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WAITLIST_BODY_MAX_BYTES = 8 * 1024;
const WAITLIST_RATE_LIMIT_WINDOW_MS = 60_000;
const WAITLIST_RATE_LIMIT_MAX = 5;
const WAITLIST_ROUTE = '/api/prelaunch';
const WAITLIST_ACTION = 'prelaunch_waitlist';
const LAUNCH_TARGET_AT = '2026-07-01T07:00:00+01:00';
const ALLOWED_LOCALES = new Set(['en', 'pt', 'es', 'fr', 'it', 'de']);
const PUBLIC_WAITLIST_ROUTE_CONTRACT = 'requireEnterpriseApiAccess is intentionally not applied because /api/prelaunch is a public waitlist capture route; it stays bounded, rate-limited, no-store and consent-only.';

void PUBLIC_WAITLIST_ROUTE_CONTRACT;

type WaitlistLeadRecord = {
  email: string;
  company_name: string;
  role: string;
  locale: string;
  source: string;
  status: string;
  launch_target_at: string;
  updated_at: string;
};

function getClientHint(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function text(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeLocale(value: unknown) {
  const locale = text(value, 8)?.toLowerCase();
  return locale && ALLOWED_LOCALES.has(locale) ? locale : 'pt';
}

function isHoneypotFilled(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function getWaitlistUrl(request: NextRequest, locale: string) {
  return `${request.nextUrl.origin}/${locale}#waitlist-form`;
}

async function enforceRateLimit(request: NextRequest) {
  const ipHint = getClientHint(request);
  const result = await checkDistributedRateLimit({
    userId: null,
    organizationId: null,
    ip: ipHint,
    userAgent: null,
    action: WAITLIST_ACTION,
    route: WAITLIST_ROUTE,
    key: `prelaunch_waitlist:${ipHint}`,
    policy: 'general-api',
    limit: WAITLIST_RATE_LIMIT_MAX,
    windowMs: WAITLIST_RATE_LIMIT_WINDOW_MS,
    failureMode: 'fail-closed',
  });

  if (!result.allowed) {
    return rateLimitResponse(result, 'Too many requests. Please try again in a minute.');
  }

  return null;
}

async function readBody(request: NextRequest) {
  try {
    const body = await readBoundedJsonRequest<unknown>(request, {
      maxBytes: WAITLIST_BODY_MAX_BYTES,
      requireJsonContentType: true,
    });

    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      console.error('[prelaunch] Request body read failed', { reason: 'unexpected_body_read_error' });
    }

    return null;
  }
}

function buildRecord(body: Record<string, unknown>): WaitlistLeadRecord | null {
  if (isHoneypotFilled(body.website)) return null;

  const email = text(body.email, 254)?.toLowerCase() ?? null;
  const companyName = text(body.companyName, 120);
  const role = text(body.role, 90);

  if (!email || !validateEmail(email) || !companyName || !role) {
    return null;
  }

  return {
    email,
    company_name: companyName,
    role,
    locale: normalizeLocale(body.locale),
    source: 'prelaunch_waitlist',
    status: 'confirmed',
    launch_target_at: LAUNCH_TARGET_AT,
    updated_at: new Date().toISOString(),
  };
}

async function saveWaitlistLead(record: WaitlistLeadRecord) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('waitlist_leads')
    .upsert(record, { onConflict: 'email' });

  if (error) {
    console.error('[prelaunch] Supabase insert failed', { reason: 'waitlist_lead_insert_failed' });
    return false;
  }

  return true;
}

async function sendConfirmation(request: NextRequest, record: WaitlistLeadRecord) {
  try {
    const result = await sendPrelaunchWaitlistEmail({
      to: record.email,
      companyName: record.company_name,
      role: record.role,
      locale: record.locale,
      joinedAt: record.updated_at,
      launchAt: record.launch_target_at,
      waitlistUrl: getWaitlistUrl(request, record.locale),
    });

    return result.sent;
  } catch {
    console.error('[prelaunch] Confirmation email failed', { reason: 'confirmation_email_failed' });
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request);
  if (rateLimited) return rateLimited;

  const body = await readBody(request);
  if (!body) {
    return noStoreJson({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (isHoneypotFilled(body.website)) {
    return noStoreJson({ ok: true }, { status: 202 });
  }

  const record = buildRecord(body);
  if (!record) {
    return noStoreJson({ error: 'Please provide company name, work email and role.' }, { status: 400 });
  }

  const saved = await saveWaitlistLead(record);
  const emailed = await sendConfirmation(request, record);

  return noStoreJson(
    {
      ok: true,
      status: 'confirmed',
      message: 'You are on the Risck Comply waitlist.',
      saved,
      emailed,
      joinedAt: record.updated_at,
      launchAt: record.launch_target_at,
    },
    { status: 201 },
  );
}
