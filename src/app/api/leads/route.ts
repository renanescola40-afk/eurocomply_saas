import { randomUUID } from 'node:crypto';

import type { NextRequest } from 'next/server';

import { sendEmail } from '@/lib/email/server-sender';
import { getBillingPlan } from '@/lib/billing/plans';
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

function formatSubmittedAt(locale: string | null, now = new Date()) {
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-PT' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Lisbon',
  }).format(now);
}

function extractPlan(source: string) {
  const match = source.match(/^contact-sales-([a-z0-9_-]+)$/i);
  const plan = getBillingPlan(match?.[1]);
  return plan?.name ?? null;
}

function localizedAcknowledgement(record: LeadRecord, requestId: string) {
  const pt = record.locale === 'pt';
  const submittedAt = formatSubmittedAt(record.locale);
  const plan = extractPlan(record.source);
  const safeName = escapeHtml(record.full_name);
  const safeCompany = escapeHtml(record.company_name);
  const safeEmail = escapeHtml(record.work_email);
  const safePlan = escapeHtml(plan);
  const safeSubmittedAt = escapeHtml(submittedAt);

  const subject = pt
    ? 'Recebemos o seu pedido comercial — RISCK COMPLY'
    : 'We received your sales request — RISCK COMPLY';

  const preheader = pt
    ? 'A nossa equipa recebeu o seu pedido e está a analisar o contexto enviado.'
    : 'Our team received your request and is reviewing the submitted context.';

  const greeting = pt ? `Olá ${safeName},` : `Hello ${safeName},`;
  const intro = pt
    ? 'Obrigado por contactar a RISCK COMPLY. Recebemos o seu pedido comercial com sucesso e a nossa equipa está a analisar as informações submetidas para preparar o próximo passo mais adequado ao seu contexto.'
    : 'Thank you for contacting RISCK COMPLY. We successfully received your sales request and our team is reviewing the information provided to prepare the most appropriate next step for your context.';

  const html = `<!doctype html>
<html lang="${pt ? 'pt' : 'en'}">
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f6fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:#ffffff;border:1px solid #dbe3ee;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#08111f;padding:26px 32px;color:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td>
                      <div style="font-size:18px;font-weight:800;letter-spacing:.02em;">RISCK COMPLY</div>
                      <div style="margin-top:5px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9fb4cc;">Enterprise AI Act Compliance</div>
                    </td>
                    <td align="right" style="font-size:12px;color:#9fb4cc;">${pt ? 'Pedido comercial' : 'Sales request'}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 32px 18px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#2563eb;">${pt ? 'Confirmação de contacto' : 'Contact confirmation'}</div>
                <h1 style="margin:10px 0 14px;font-size:30px;line-height:1.2;color:#0b1220;">${pt ? 'Recebemos o seu pedido comercial' : 'We received your sales request'}</h1>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.7;color:#334155;">${greeting}</p>
                <p style="margin:0;font-size:16px;line-height:1.7;color:#334155;">${intro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 10px;">
                <div style="border:1px solid #dbe3ee;border-radius:14px;background:#f8fafc;padding:20px;">
                  <div style="margin-bottom:14px;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#475569;">${pt ? 'Resumo do pedido' : 'Request summary'}</div>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;color:#334155;">
                    <tr><td style="padding:7px 0;color:#64748b;width:38%;">${pt ? 'Empresa' : 'Company'}</td><td style="padding:7px 0;font-weight:700;color:#0f172a;">${safeCompany}</td></tr>
                    <tr><td style="padding:7px 0;color:#64748b;">${pt ? 'Email de contacto' : 'Contact email'}</td><td style="padding:7px 0;font-weight:700;color:#0f172a;">${safeEmail}</td></tr>
                    ${plan ? `<tr><td style="padding:7px 0;color:#64748b;">${pt ? 'Plano' : 'Plan'}</td><td style="padding:7px 0;font-weight:700;color:#0f172a;">${safePlan}</td></tr>` : ''}

                    <tr><td style="padding:7px 0;color:#64748b;">${pt ? 'Submetido em' : 'Submitted at'}</td><td style="padding:7px 0;font-weight:700;color:#0f172a;">${safeSubmittedAt}</td></tr>
                  </table>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 8px;">
                <div style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#475569;">${pt ? 'Próximos passos' : 'Next steps'}</div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:12px;font-size:15px;line-height:1.6;color:#334155;">
                  <tr><td style="width:26px;vertical-align:top;color:#2563eb;font-weight:800;">01</td><td style="padding-bottom:10px;">${pt ? 'Análise do contexto e das informações submetidas.' : 'Review of the context and information submitted.'}</td></tr>
                  <tr><td style="width:26px;vertical-align:top;color:#2563eb;font-weight:800;">02</td><td style="padding-bottom:10px;">${pt ? 'Validação comercial inicial e, quando aplicável, alinhamento de procurement.' : 'Initial commercial validation and, where applicable, procurement alignment.'}</td></tr>
                  <tr><td style="width:26px;vertical-align:top;color:#2563eb;font-weight:800;">03</td><td>${pt ? 'Contacto da nossa equipa através deste endereço de email.' : 'Follow-up from our team through this email address.'}</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 34px;">
                <div style="border-left:3px solid #2563eb;padding:12px 16px;background:#f8fafc;color:#475569;font-size:14px;line-height:1.6;">
                  ${pt ? 'Se pretender acrescentar contexto adicional, basta responder diretamente a esta mensagem.' : 'If you would like to add more context, simply reply directly to this message.'}
                </div>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e2e8f0;padding:22px 32px;background:#fbfdff;font-size:12px;line-height:1.7;color:#64748b;">
                <strong style="color:#0f172a;">RISCK COMPLY</strong><br/>
                AI Act compliance readiness & evidence operations<br/>
                <a href="https://www.risckcomply.com" style="color:#2563eb;text-decoration:none;">www.risckcomply.com</a> ·
                <a href="mailto:comercial@risckcomply.com" style="color:#2563eb;text-decoration:none;">comercial@risckcomply.com</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = pt
    ? [
        'RISCK COMPLY — Confirmação de contacto',
        '',
        `Olá ${record.full_name},`,
        '',
        'Obrigado por contactar a RISCK COMPLY. Recebemos o seu pedido comercial com sucesso e a nossa equipa está a analisar as informações submetidas.',
        '',
        'Resumo do pedido',
        `Empresa: ${record.company_name}`,
        `Email de contacto: ${record.work_email}`,
        ...(plan ? [`Plano: ${plan}`] : []),
        `Submetido em: ${submittedAt}`,
        '',
        'Próximos passos:',
        '1. Análise do contexto e das informações submetidas.',
        '2. Validação comercial inicial e, quando aplicável, alinhamento de procurement.',
        '3. Contacto da nossa equipa através deste endereço de email.',
        '',
        'Se pretender acrescentar contexto adicional, responda diretamente a esta mensagem.',
        '',
        'RISCK COMPLY',
        'AI Act compliance readiness & evidence operations',
        'www.risckcomply.com',
        SALES_MAILBOX,
      ].join('\n')
    : [
        'RISCK COMPLY — Contact confirmation',
        '',
        `Hello ${record.full_name},`,
        '',
        'Thank you for contacting RISCK COMPLY. We successfully received your sales request and our team is reviewing the information provided.',
        '',
        'Request summary',
        `Company: ${record.company_name}`,
        `Contact email: ${record.work_email}`,
        ...(plan ? [`Plan: ${plan}`] : []),
        `Submitted at: ${submittedAt}`,
        '',
        'Next steps:',
        '1. Review of the context and information submitted.',
        '2. Initial commercial validation and, where applicable, procurement alignment.',
        '3. Follow-up from our team through this email address.',
        '',
        'If you would like to add more context, reply directly to this message.',
        '',
        'RISCK COMPLY',
        'AI Act compliance readiness & evidence operations',
        'www.risckcomply.com',
        SALES_MAILBOX,
      ].join('\n');

  return { subject, html, text, plan, submittedAt };
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
  const acknowledgement = localizedAcknowledgement(record, requestId);

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
      metadata: {
        source: record.source,
        locale: record.locale,
        plan: acknowledgement.plan,
      },
    }),
  ]);

  const internalSent = internalResult.status === 'fulfilled' && internalResult.value.sent;
  const acknowledgementSent = acknowledgementResult.status === 'fulfilled' && acknowledgementResult.value.sent;

  if (!internalSent) {
    console.error('[leads] Internal sales notification delivery failed');
  }

  if (!acknowledgementSent) {
    console.error('[leads] Customer acknowledgement delivery failed');
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

  await sendLeadEmails(record);

  return noStoreJson({ ok: true }, { status: 201 });
}
