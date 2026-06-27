import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const WEBHOOK_TIMEOUT_MS = 3_500;

type RateState = {
  count: number;
  resetAt: number;
};

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

const rateLimit = new Map<string, RateState>();

function getClientHint(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function isRateLimited(key: string) {
  const now = Date.now();
  const existing = rateLimit.get(key);

  if (!existing || existing.resetAt < now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  existing.count += 1;
  rateLimit.set(key, existing);
  return existing.count > RATE_LIMIT_MAX;
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

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function readBody(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function saveToSupabase(record: LeadRecord) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return false;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.from('sales_leads').insert(record);
  if (error) {
    console.error('[leads] Supabase insert failed', { message: error.message });
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
  } catch (error) {
    console.error('[leads] Webhook failed', { message: error instanceof Error ? error.message : 'unknown error' });
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  const ipHint = getClientHint(request);
  if (isRateLimited(ipHint)) {
    return noStoreJson({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 });
  }

  const body = await readBody(request);
  if (!body) {
    return noStoreJson({ error: 'Invalid request body.' }, { status: 400 });
  }

  const fullName = text(body.fullName, 120);
  const workEmail = text(body.workEmail, 180)?.toLowerCase() || null;
  const companyName = text(body.companyName, 160);
  const consentToContact = booleanValue(body.consentToContact);

  if (!fullName || !workEmail || !companyName || !validEmail(workEmail) || !consentToContact) {
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
    user_agent: text(request.headers.get('user-agent'), 300),
    ip_hint: ipHint,
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
