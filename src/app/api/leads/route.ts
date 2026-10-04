import { randomUUID } from 'node:crypto';

import type { NextRequest } from 'next/server';

import { sendEmail } from '@/lib/email/server-sender';
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
const SALES_MAILBOX = 'comercial@risckcomply.com';

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


function escapeHtml(value: string | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function localizedAcknowledgement(locale: string | null, fullName: string) {
  const pt = locale === 'pt';
  const safeName = escapeHtml(fullName);

  if (pt) {
    return {
      subject: 'Recebemos o seu pedido — RISCK COMPLY',
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h2>Recebemos o seu pedido</h2><p>Olá ${safeName},</p><p>Obrigado por contactar a RISCK COMPLY. Recebemos o seu pedido comercial e a nossa equipa está a analisar as informações enviadas.</p><p>Entraremos em contacto através deste endereço de email assim que tivermos o próximo passo.</p><p>RISCK COMPLY</p></div>`,
      text: `Olá ${fullName},\n\nObrigado por contactar a RISCK COMPLY. Recebemos o seu pedido comercial e a nossa equipa está a analisar as informações enviadas.\n\nEntraremos em contacto através deste endereço de email assim que tivermos o próximo passo.\n\nRISCK COMPLY`,
    };
  }

  return {
    subject: 'We received your request — RISCK COMPLY',
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h2>We received your request</h2><p>Hello ${safeName},</p><p>Thank you for contacting RISCK COMPLY. We received your sales request and our team is reviewing the information you provided.</p><p>We will contact you at this email address with the appropriate next step.</p><p>RISCK COMPLY</p></div>`,
    text: `Hello ${fullName},\n\nThank you for contacting RISCK COMPLY. We received your sales request and our team is reviewing the information you provided.\n\nWe will contact you at this email address with the appropriate next step.\n\nRISCK COMPLY`,
  };
}

function internalLeadNotification(record: LeadRecord) {
  const rows = [
    ['Nome', record.full_name],
    ['Email', record.work_email],
    ['Empresa', record.company_name],
    ['Função', record.role],
    ['Dimensão', record.company_size],
    ['Região', record.region],
    ['Origem', record.source],
    ['Idioma', record.locale],
    ['Mensagem', record.message],
  ].filter(([, value]) => Boolean(value));

  const htmlRows = rows
    .map(([label, value]) => `<tr><td style="padding:6px 10px;font-weight:700;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 10px">${escapeHtml(value)}</td></tr>`)
    .join('');

  return {
    subject: `Novo pedido comercial — ${record.company_name}`,
    html: `<div style="font-family:Arial,sans-serif;color:#0f172a"><h2>Novo pedido comercial RISCK COMPLY</h2><table style="border-collapse:collapse">${htmlRows}</table><p>Responda a este email para contactar diretamente o cliente.</p></div>`,
    text: ['Novo pedido comercial RISCK COMPLY', ...rows.map(([label, value]) => `${label}: ${value}`), '', 'Responda a este email para contactar diretamente o cliente.'].join('\n'),
  };
}

async function sendLeadEmails(record: LeadRecord) {
  const requestId = randomUUID();
  const internal = internalLeadNotification(record);
  const acknowledgement = localizedAcknowledgement(record.locale, record.full_name);

  const [internalResult, acknowledgementResult] = await Promise.allSettled([
    sendEmail({
      to: SALES_MAILBOX,
      replyTo: record.work_email,
      subject: internal.subject,
      html: internal.html,
      text: internal.text,
      template: 'sales_lead_internal',
      idempotencyKey: `sales-lead/internal/${requestId}`,
      metadata: { source: record.source, locale: record.locale, company: record.company_name },
    }),
    sendEmail({
      to: record.work_email,
      replyTo: SALES_MAILBOX,
      subject: acknowledgement.subject,
      html: acknowledgement.html,
      text: acknowledgement.text,
      template: 'sales_lead_acknowledgement',
      idempotencyKey: `sales-lead/ack/${requestId}`,
      metadata: { source: record.source, locale: record.locale },
    }),
  ]);

  const internalSent = internalResult.status === 'fulfilled' && internalResult.value.sent;
  const acknowledgementSent = acknowledgementResult.status === 'fulfilled' && acknowledgementResult.value.sent;

  if (!internalSent) {
    console.error('[leads] Internal sales notification delivery failed', { reason: 'internal_sales_email_failed' });
  }

  if (!acknowledgementSent) {
    console.error('[leads] Customer acknowledgement delivery failed', { reason: 'customer_ack_email_failed' });
  }

  return { internalSent, acknowledgementSent };
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

  const emailDelivery = await sendLeadEmails(record);

  return noStoreJson(
    {
      ok: true,
      notificationQueued: emailDelivery.internalSent,
      acknowledgementQueued: emailDelivery.acknowledgementSent,
    },
    { status: 201 },
  );
}
