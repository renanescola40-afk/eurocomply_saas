import type { NextRequest } from 'next/server';

import { sendInternalWaitlistNotification, sendPrelaunchWaitlistEmail } from '@/lib/email/prelaunch-waitlist';
import type { SendEmailResult } from '@/lib/email/client';
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
const LAUNCH_TARGET_AT = '2026-08-01T07:00:00+01:00';
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

type SaveWaitlistLeadResult = {
  saved: boolean;
  inserted: boolean;
  storage: 'waitlist_leads' | 'sales_leads' | 'none';
};

type WaitlistEmailDelivery = Pick<SendEmailResult, 'sent' | 'provider' | 'status' | 'attempts'>;

const EMAIL_FAILED_RESULT: WaitlistEmailDelivery = {
  sent: false,
  provider: 'console',
  status: 'failed',
  attempts: 0,
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

function emailDiagnostics(result: WaitlistEmailDelivery) {
  return {
    sent: result.sent,
    provider: result.provider,
    status: result.status,
    attempts: result.attempts,
  };
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
    failureMode: 'fail-open',
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
      console.error('[prelaunch] unexpected_body_read_error');
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

function buildSalesLeadFallbackRecord(request: NextRequest, record: WaitlistLeadRecord) {
  return {
    full_name: record.company_name,
    work_email: record.email,
    company_name: record.company_name,
    role: record.role,
    company_size: null,
    region: null,
    compliance_drivers: 'Early access waitlist / EU AI Act readiness',
    timeline: 'prelaunch_waitlist',
    current_process: null,
    message: 'Captured from the public prelaunch waitlist form after the dedicated waitlist table was unavailable.',
    source: 'prelaunch_waitlist',
    locale: record.locale,
    consent_to_contact: true,
    user_agent: text(request.headers.get('user-agent'), 300),
    ip_hint: getClientHint(request),
    status: 'new',
    notes: 'Fallback capture: verify public.waitlist_leads migration in production Supabase.',
  };
}

async function saveWaitlistLead(request: NextRequest, record: WaitlistLeadRecord): Promise<SaveWaitlistLeadResult> {
  const supabase = tryCreateAdminClient();
  if (!supabase) return { saved: false, inserted: false, storage: 'none' };

  const { data, error } = await supabase
    .from('waitlist_leads')
    .upsert(record, { onConflict: 'email', ignoreDuplicates: true })
    .select('email')
    .maybeSingle<{ email: string }>();

  if (!error) {
    return { saved: true, inserted: Boolean(data?.email), storage: 'waitlist_leads' };
  }

  console.error('[prelaunch] waitlist_lead_insert_failed');

  const { error: fallbackError } = await supabase.from('sales_leads').insert(buildSalesLeadFallbackRecord(request, record));
  if (fallbackError) {
    console.error('[prelaunch] waitlist_sales_lead_fallback_failed');
    return { saved: false, inserted: false, storage: 'none' };
  }

  return { saved: true, inserted: true, storage: 'sales_leads' };
}

async function sendConfirmation(request: NextRequest, record: WaitlistLeadRecord): Promise<WaitlistEmailDelivery> {
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

    return emailDiagnostics(result);
  } catch {
    console.error('[prelaunch] confirmation_email_failed');
    return EMAIL_FAILED_RESULT;
  }
}

async function notifyInternalTeam(request: NextRequest, record: WaitlistLeadRecord): Promise<WaitlistEmailDelivery> {
  try {
    const result = await sendInternalWaitlistNotification({
      to: record.email,
      companyName: record.company_name,
      role: record.role,
      locale: record.locale,
      joinedAt: record.updated_at,
      launchAt: record.launch_target_at,
      waitlistUrl: getWaitlistUrl(request, record.locale),
      totalLeads: null,
    });

    return emailDiagnostics(result);
  } catch {
    console.error('[prelaunch] internal_notification_failed');
    return EMAIL_FAILED_RESULT;
  }
}

function shouldNotifyInternalTeam(saveResult: SaveWaitlistLeadResult) {
  return saveResult.inserted;
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

  const saveResult = await saveWaitlistLead(request, record);
  if (!saveResult.saved) {
    const fallbackNotification = await notifyInternalTeam(request, record);

    if (!fallbackNotification.sent) {
      return noStoreJson({ error: 'Unable to join waitlist right now.' }, { status: 503 });
    }

    return noStoreJson(
      {
        ok: true,
        status: 'received',
        emailed: false,
        message: 'Your request was received by the Risck Comply team.',
        joinedAt: record.updated_at,
        launchAt: record.launch_target_at,
      },
      { status: 202 },
    );
  }

  const confirmation = await sendConfirmation(request, record);

  if (shouldNotifyInternalTeam(saveResult)) {
    await notifyInternalTeam(request, record);
  }

  return noStoreJson(
    {
      ok: true,
      status: 'confirmed',
      emailed: confirmation.sent,
      message: 'You are on the Risck Comply waitlist.',
      joinedAt: record.updated_at,
      launchAt: record.launch_target_at,
    },
    { status: 201 },
  );
}
