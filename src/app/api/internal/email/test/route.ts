import { z } from 'zod';

import { sendEmail } from '@/lib/email/client';
import {
  billingStartedEmail,
  complianceDeadlineReminderEmail,
  documentExpiringEmail,
  exportReadyEmail,
  invoiceFailedEmail,
  memberInvitedEmail,
  organizationCreatedEmail,
  securityAlertEmail,
  trialUpgradeEmail,
  vendorReviewEmail,
  welcomeOnboardingEmail,
  type EmailTemplateKey,
} from '@/lib/email/templates';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { checkDistributedRateLimit } from '@/lib/security/rate-limit';
import { readBoundedJsonRequest, ValidationError, validationErrorResponse } from '@/lib/security/validate';
import { enforceInternalAuthenticationRateLimit } from '@/server/security/internal-auth-rate-limit';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TEST_EMAIL_BODY_MAX_BYTES = 4 * 1024;
const TEST_EMAIL_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const TEST_EMAIL_RATE_LIMIT_MAX = 5;
const TEST_EMAIL_ROUTE = '/api/internal/email/test';
const TEST_EMAIL_ACTION = 'send_test_email';
const TEST_EMAIL_AUTH_ACTION = 'authenticate_internal_email_test';
const TEST_EMAIL_RATE_LIMIT_KEY = 'internal-email-test:route';
const TEST_EMAIL_DEFAULT_ORG_NAME = 'Risck Comply Demo Org';

const TEST_EMAIL_TEMPLATES = [
  'welcome_onboarding',
  'organization_created',
  'member_invited',
  'billing_started',
  'invoice_failed',
  'compliance_deadline_reminder',
  'export_ready',
  'security_alert',
  'trial_upgrade',
  'document_expiring',
  'vendor_review',
] as const satisfies readonly EmailTemplateKey[];

const testEmailPayloadSchema = z
  .object({
    to: z.string().trim().email().max(254).refine((value) => !value.includes(','), { message: 'Only one test recipient is allowed' }),
    template: z.enum(TEST_EMAIL_TEMPLATES).default('welcome_onboarding'),
    organizationName: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

type TestEmailPayload = z.infer<typeof testEmailPayloadSchema>;

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function hasInternalAuthMaterial(request: Request) {
  return Boolean(request.headers.get('authorization') || request.headers.get('x-internal-cron-secret'));
}

function splitList(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getAllowedRecipients() {
  return splitList(process.env.INTERNAL_EMAIL_TEST_ALLOWED_RECIPIENTS)
    .concat(splitList(process.env.EMAIL_TEST_ALLOWED_RECIPIENTS));
}

function matchesAllowedRecipient(to: string, allowedRecipient: string) {
  const recipient = to.toLowerCase();
  const allowed = allowedRecipient.toLowerCase();

  if (allowed === recipient) return true;
  if (allowed.startsWith('*@')) return recipient.endsWith(allowed.slice(1));
  if (allowed.startsWith('@')) return recipient.endsWith(allowed);

  return false;
}

function isAllowedTestRecipient(to: string) {
  const allowedRecipients = getAllowedRecipients();

  if (allowedRecipients.length > 0) {
    return allowedRecipients.some((allowedRecipient) => matchesAllowedRecipient(to, allowedRecipient));
  }

  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  return to.toLowerCase().endsWith('.test');
}

function assertProductionEmailConfigured() {
  if (process.env.NODE_ENV !== 'production') return true;
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function buildTemplate(template: EmailTemplateKey, organizationName: string) {
  const appUrl = getAppUrl();

  switch (template) {
    case 'welcome_onboarding':
      return welcomeOnboardingEmail({ organizationName, dashboardUrl: `${appUrl}/pt/dashboard` });
    case 'organization_created':
      return organizationCreatedEmail({ organizationName, organizationUrl: `${appUrl}/pt/dashboard/organizations`, createdByName: 'Risck Comply Admin' });
    case 'member_invited':
      return memberInvitedEmail({ organizationName, role: 'member', inviteUrl: `${appUrl}/pt/dashboard/organizations/invitations`, invitedByName: 'Risck Comply Admin' });
    case 'billing_started':
      return billingStartedEmail({ organizationName, planName: 'Professional', billingUrl: `${appUrl}/pt/dashboard/organizations/billing` });
    case 'invoice_failed':
      return invoiceFailedEmail({ organizationName, billingUrl: `${appUrl}/pt/dashboard/organizations/billing`, amountDue: '€99.00' });
    case 'compliance_deadline_reminder':
      return complianceDeadlineReminderEmail({
        organizationName,
        deadlineName: 'EU AI Act readiness review',
        dueDate: '2026-08-02',
        dashboardUrl: `${appUrl}/pt/dashboard`,
        unsubscribeUrl: `${appUrl}/pt/dashboard/settings/notifications`,
      });
    case 'export_ready':
      return exportReadyEmail({ organizationName, exportName: 'Compliance evidence pack', exportsUrl: `${appUrl}/pt/dashboard/exports` });
    case 'security_alert':
      return securityAlertEmail({
        organizationName,
        alertTitle: 'New administrator sign-in detected',
        occurredAt: new Date().toISOString(),
        securityUrl: `${appUrl}/pt/dashboard/security`,
        ipAddress: '203.0.113.10',
        location: 'Lisbon, Portugal',
      });
    case 'trial_upgrade':
      return trialUpgradeEmail({ organizationName, billingUrl: `${appUrl}/pt/dashboard/organizations/billing`, daysRemaining: 3 });
    case 'document_expiring':
      return documentExpiringEmail({ organizationName, documentName: 'Document review test', expiresAt: '2026-08-02', documentsUrl: `${appUrl}/pt/dashboard/documents` });
    case 'vendor_review':
      return vendorReviewEmail({ organizationName, vendorName: 'Vendor review test', vendorsUrl: `${appUrl}/pt/dashboard/vendors`, reviewDueAt: '2026-08-02' });
  }
}

async function readPayload(request: Request) {
  const rawBody = await readBoundedJsonRequest<unknown>(request, {
    maxBytes: TEST_EMAIL_BODY_MAX_BYTES,
    requireJsonContentType: true,
  });
  const result = testEmailPayloadSchema.safeParse(rawBody);

  if (!result.success) {
    throw new ValidationError(result.error.issues);
  }

  return result.data;
}

async function enforceRateLimit() {
  const rateLimit = await checkDistributedRateLimit({
    key: TEST_EMAIL_RATE_LIMIT_KEY,
    policy: 'health-internal',
    route: TEST_EMAIL_ROUTE,
    action: TEST_EMAIL_ACTION,
    ip: null,
    userAgent: null,
    limit: TEST_EMAIL_RATE_LIMIT_MAX,
    windowMs: TEST_EMAIL_RATE_LIMIT_WINDOW_MS,
    failureMode: 'fail-closed',
  });

  if (rateLimit.allowed) return null;

  const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));

  return noStoreJson(
    { error: rateLimit.reason ? 'security_control_unavailable' : 'rate_limit_exceeded', retryAfter },
    {
      status: rateLimit.reason ? 503 : 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
      },
    },
  );
}

export async function POST(request: Request) {
  const authRateLimited = await enforceInternalAuthenticationRateLimit(request, {
    route: TEST_EMAIL_ROUTE,
    action: TEST_EMAIL_AUTH_ACTION,
  });
  if (authRateLimited) return authRateLimited;

  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'unauthorized' }, { status: hasInternalAuthMaterial(request) ? 403 : 401 });
  }

  const rateLimited = await enforceRateLimit();
  if (rateLimited) return rateLimited;

  let body: TestEmailPayload;

  try {
    body = await readPayload(request);
  } catch (error) {
    const response = validationErrorResponse(error);
    if (response) return response;

    return noStoreJson({ error: 'invalid_request_payload' }, { status: 400 });
  }

  if (!isAllowedTestRecipient(body.to)) {
    return noStoreJson({ error: 'test_recipient_not_allowed' }, { status: 403 });
  }

  if (!assertProductionEmailConfigured()) {
    return noStoreJson({ error: 'email_delivery_not_configured' }, { status: 503 });
  }

  const organizationName = body.organizationName || TEST_EMAIL_DEFAULT_ORG_NAME;
  const email = buildTemplate(body.template, organizationName);

  try {
    const result = await sendEmail({
      to: body.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      template: email.template,
      unsubscribeUrl: email.unsubscribeUrl,
      idempotencyKey: `test:${body.template}:${body.to.toLowerCase()}:${Date.now()}`,
      metadata: {
        source: 'internal_email_test_endpoint',
        mailbox_provider_target: body.to.toLowerCase().includes('outlook') ? 'outlook' : body.to.toLowerCase().includes('gmail') ? 'gmail' : 'manual',
      },
    });

    return noStoreJson({ ok: true, template: email.template, provider: result.provider, providerId: result.id ?? null, status: result.status, attempts: result.attempts });
  } catch {
    return noStoreJson({ error: 'email_delivery_unavailable' }, { status: 503 });
  }
}
