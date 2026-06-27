import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateLimit = new Map<string, RateState>();

const optionalTextSchema = (maxLength: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value),
    z.string().max(maxLength).optional().nullable(),
  );

const leadSchema = z.object({
  fullName: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value),
    z.string().min(1).max(120),
  ),
  workEmail: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : value),
    z.string().email().max(180),
  ),
  companyName: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value),
    z.string().min(1).max(160),
  ),
  role: optionalTextSchema(120),
  companySize: optionalTextSchema(80),
  region: optionalTextSchema(120),
  complianceDrivers: z
    .array(z.string().trim().max(80))
    .max(10)
    .optional()
    .default([]),
  timeline: optionalTextSchema(120),
  currentProcess: optionalTextSchema(700),
  message: optionalTextSchema(1000),
  source: optionalTextSchema(120),
  locale: optionalTextSchema(12),
  consentToContact: z.literal(true),
});

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

function emptyToNull(value: string | null | undefined) {
  return value || null;
}

function joinDrivers(value: string[]) {
  return value.length > 0 ? value.join(', ').slice(0, 500) : null;
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

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'sales_lead.created', lead: record }),
    });

    return response.ok;
  } catch (error) {
    console.error('[leads] Webhook failed', { message: error instanceof Error ? error.message : 'unknown error' });
    return false;
  }
}

export async function POST(request: NextRequest) {
  const ipHint = getClientHint(request);
  if (isRateLimited(ipHint)) {
    return noStoreJson({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 });
  }

  const body = await readBody(request);
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return noStoreJson(
      { error: 'Please provide name, work email, company and consent to contact.' },
      { status: 400 },
    );
  }

  const lead = parsed.data;
  const record: LeadRecord = {
    full_name: lead.fullName,
    work_email: lead.workEmail,
    company_name: lead.companyName,
    role: emptyToNull(lead.role),
    company_size: emptyToNull(lead.companySize),
    region: emptyToNull(lead.region),
    compliance_drivers: joinDrivers(lead.complianceDrivers),
    timeline: emptyToNull(lead.timeline),
    current_process: emptyToNull(lead.currentProcess),
    message: emptyToNull(lead.message),
    source: lead.source || 'book-demo',
    locale: emptyToNull(lead.locale),
    consent_to_contact: lead.consentToContact,
    user_agent: request.headers.get('user-agent')?.trim().slice(0, 300) || null,
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
