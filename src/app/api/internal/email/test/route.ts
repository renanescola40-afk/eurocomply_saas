import { sendEmail } from '@/lib/email/client';
import {
  billingStartedEmail,
  complianceDeadlineReminderEmail,
  exportReadyEmail,
  invoiceFailedEmail,
  memberInvitedEmail,
  organizationCreatedEmail,
  securityAlertEmail,
  welcomeOnboardingEmail,
  type EmailTemplateKey,
} from '@/lib/email/templates';
import { isAuthorizedInternalCronRequest } from '@/lib/security/internal-cron';
import { readBoundedJsonRequest, validationErrorResponse } from '@/lib/security/validate';
import { noStoreJson } from '@/server/security/no-store';

export const runtime = 'nodejs';

const TEST_EMAIL_BODY_MAX_BYTES = 4 * 1024;

type TestEmailPayload = {
  to?: string;
  template?: EmailTemplateKey;
  organizationName?: string;
};

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function buildTemplate(template: EmailTemplateKey, organizationName: string) {
  const appUrl = getAppUrl();

  switch (template) {
    case 'welcome_onboarding':
      return welcomeOnboardingEmail({ organizationName, dashboardUrl: `${appUrl}/pt/dashboard` });
    case 'organization_created':
      return organizationCreatedEmail({ organizationName, organizationUrl: `${appUrl}/pt/dashboard/organizations`, createdByName: 'RISCK COMPLY Admin' });
    case 'member_invited':
      return memberInvitedEmail({ organizationName, role: 'member', inviteUrl: `${appUrl}/pt/dashboard/organizations/invitations`, invitedByName: 'RISCK COMPLY Admin' });
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
      return billingStartedEmail({ organizationName, planName: 'Trial validation', billingUrl: `${appUrl}/pt/dashboard/organizations/billing` });
    case 'document_expiring':
      return complianceDeadlineReminderEmail({
        organizationName,
        deadlineName: 'Document review test',
        dueDate: '2026-08-02',
        dashboardUrl: `${appUrl}/pt/dashboard/documents`,
      });
    case 'vendor_review':
      return complianceDeadlineReminderEmail({
        organizationName,
        deadlineName: 'Vendor review test',
        dueDate: '2026-08-02',
        dashboardUrl: `${appUrl}/pt/dashboard/vendors`,
      });
    default:
      return welcomeOnboardingEmail({ organizationName, dashboardUrl: `${appUrl}/pt/dashboard` });
  }
}

export async function POST(request: Request) {
  if (!isAuthorizedInternalCronRequest(request)) {
    return noStoreJson({ error: 'unauthorized' }, { status: 401 });
  }

  let body: TestEmailPayload;

  try {
    body = await readBoundedJsonRequest<TestEmailPayload>(request, {
      maxBytes: TEST_EMAIL_BODY_MAX_BYTES,
    });
  } catch (error) {
    return validationErrorResponse(error) ?? noStoreJson({ error: 'invalid_request_payload' }, { status: 400 });
  }

  const to = body.to?.trim();

  if (!to) {
    return noStoreJson({ error: 'missing_to' }, { status: 400 });
  }

  const template = body.template ?? 'welcome_onboarding';
  const organizationName = body.organizationName?.trim() || 'RISCK COMPLY Demo Org';
  const email = buildTemplate(template, organizationName);

  const result = await sendEmail({
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    template: email.template,
    unsubscribeUrl: email.unsubscribeUrl,
    idempotencyKey: `test:${template}:${to}:${Date.now()}`,
    metadata: {
      source: 'internal_email_test_endpoint',
      mailbox_provider_target: to.toLowerCase().includes('outlook') ? 'outlook' : to.toLowerCase().includes('gmail') ? 'gmail' : 'manual',
    },
  });

  return noStoreJson({ ok: true, template: email.template, provider: result.provider, providerId: result.id ?? null, status: result.status, attempts: result.attempts });
}
