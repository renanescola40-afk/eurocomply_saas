import type { NextRequest } from 'next/server';

import { rateLimitResponse } from '@/lib/security/rate-limit-response';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { readBoundedJsonRequest, ValidationError } from '@/lib/security/validate';
import { tryCreateAdminClient } from '@/lib/supabase/admin';
import { noStoreJson } from '@/server/security/no-store';
import { hashRateLimitIp, hashRateLimitUserAgent } from '@/server/security/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const WEBHOOK_TIMEOUT_MS = 3_500;
const LEAD_CAPTURE_BODY_MAX_BYTES = 16 * 1024;

const LEAD_CAPTURE_ROUTE = '/api/leads';
const LEAD_CAPTURE_ACTION = 'lead_capture';

type LeadRecord = {
  full_name: string;
  work_email: string;
  company_name: string;
  role: string | null;
  company_size: string | null;
  region: string | null;
  compliance_drivers: string | null;
  timeline: string | null;
  current_process: string | null;
  message: string | null;
  source: string;
  locale: string | null;
  consent_to_contact: boolean;
  user_agent: string | null;
  ip_hint: string | null;
};

function getClientHint(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function getPrivacySafeUserAgent(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')?.trim();
  return userAgent ? hashRateLimitUserAgent(userAgent) : null;
}

async function enforceLeadCaptureRateLimit(request: NextRequest) {
  const ipHint = getClientHint(request);
  const result = await checkDistributedRateLimit({
    userId: null,
    organizationId: null,
    ip: ipHint,
    userAgent: null,
    action: LEAD_CAPTURE_ACTION,
    route: LEAD_CAPTURE_ROUTE,
    key: `lead_capture:${ipHint}`,
    policy: 'general-api',
    limit: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
    failureMode: 'fail-closed',
  });
  const isRateLimited = (hint: string) => hint === ipHint && !result.allowed;

  if (isRateLimited(ipHint)) {
    return rateLimitResponse(result, 'Too many requests. Please try again in a minute.');
  }

  return null;
}

function text(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function booleanValue(value: unknown) {
  return value === true || value === 'true' || value === 'on';
}

function joinDrivers(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => text(item, 80)).filter(Boolean).join(', ').slice(0, 500) || null;
  }

  return text(value, 500);
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function readBody(request: NextRequest) {
  try {
    const body = await readBoundedJsonRequest<unknown>(request, {
      maxBytes: LEAD_CAPTURE_BODY_MAX_BYTES,
      requireJsonContentType: true,
    });

    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      console.error('[leads] Request body read failed', { reason: 'unexpected_body_read_error' });
    }

    return null;
  }
}

async function saveToSupabase(record: LeadRecord) {
  const supabase = tryCreateAdminClient();
  if (!supabase) return false;

  const { error } = await supabase.from('sales_leads').insert(record);
  if (error) {
    console.error('[leads] Supabase insert failed', { reason: 'lead_insert_failed' });
    return false;
  }

  return true;
}

async function sendWebhook(record: LeadRecord) {
  const webhookUrl = process.env.RISCK_COMPLY_LEAD_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'sales_lead.created', lead: record }),
      cache: 'no-store',
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    console.error('[leads] Webhook failed', { reason: 'lead_webhook_failed' });
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  const rateLimited = await enforceLeadCaptureRateLimit(request);
  if (rateLimited) return rateLimited;

  const ipHint = getClientHint(request);
  const body = await readBody(request);
  if (!body) {
    return noStoreJson({ error: 'Invalid request body.' }, { status: 400 });
  }

  const fullName = text(body.fullName, 120);
  const workEmail = text(body.workEmail, 180)?.toLowerCase() || null;
  const companyName = text(body.companyName, 160);
  const consentToContact = booleanValue(body.consentToContact);

  if (!fullName || !workEmail || !companyName || !validateEmail(workEmail) || !consentToContact) {
    return noStoreJson(
      { error: 'Please provide name, work email, company and consent to contact.' },
      { status: 400 },
    );
  }

  const record: LeadRecord = {
    full_name: fullName,
    work_email: workEmail,
    company_name: companyName,
    role: text(body.role, 120),
    company_size: text(body.companySize, 80),
    region: text(body.region, 120),
    compliance_drivers: joinDrivers(body.complianceDrivers),
    timeline: text(body.timeline, 120),
    current_process: text(body.currentProcess, 700),
    message: text(body.message, 1000),
    source: text(body.source, 120) || 'book-demo',
    locale: text(body.locale, 12),
    consent_to_contact: consentToContact,
    user_agent: getPrivacySafeUserAgent(request),
    ip_hint: ipHint === 'unknown' ? null : hashRateLimitIp(ipHint),
  };

  const savedToSupabase = await saveToSupabase(record);
  const sentToWebhook = await sendWebhook(record);

  if (!savedToSupabase && !sentToWebhook) {
    return noStoreJson(
      { error: 'Lead capture is not configured yet. Please contact sales directly.' },
      { status: 503 },
    );
  }

  return noStoreJson({ ok: true }, { status: 201 });
}
