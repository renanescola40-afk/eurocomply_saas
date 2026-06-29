export type EmailTemplateKey =
  | 'welcome_onboarding'
  | 'organization_created'
  | 'member_invited'
  | 'billing_started'
  | 'invoice_failed'
  | 'compliance_deadline_reminder'
  | 'export_ready'
  | 'security_alert'
  | 'trial_upgrade'
  | 'document_expiring'
  | 'vendor_review';

type BuiltEmail = {
  template: EmailTemplateKey;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string | null;
};

type BaseTemplateInput = { organizationName: string };
type WelcomeOnboardingEmailInput = BaseTemplateInput & { dashboardUrl: string };
type OrganizationCreatedEmailInput = BaseTemplateInput & { organizationUrl: string; createdByName?: string | null };
type MemberInvitedEmailInput = BaseTemplateInput & { role: string; inviteUrl: string; invitedByName?: string | null };
type BillingStartedEmailInput = BaseTemplateInput & { planName: string; billingUrl: string };
type InvoiceFailedEmailInput = BaseTemplateInput & { billingUrl: string; amountDue?: string | null; dueDate?: string | null };
type ComplianceDeadlineReminderEmailInput = BaseTemplateInput & { deadlineName: string; dueDate: string; dashboardUrl: string; unsubscribeUrl?: string | null };
type ExportReadyEmailInput = BaseTemplateInput & { exportName: string; exportsUrl: string };
type SecurityAlertEmailInput = BaseTemplateInput & { alertTitle: string; occurredAt: string; securityUrl: string; ipAddress?: string | null; location?: string | null };
type TrialUpgradeEmailInput = BaseTemplateInput & { billingUrl: string; daysRemaining?: number };
type DocumentExpiringEmailInput = BaseTemplateInput & { documentName: string; expiresAt: string; documentsUrl: string };
type VendorReviewEmailInput = BaseTemplateInput & { vendorName: string; vendorsUrl: string; reviewDueAt?: string | null };

const PRODUCT_NAME = 'Risck Comply';

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeUrl(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('https://') || trimmed.startsWith('http://localhost')) return trimmed;
  return '/';
}

function renderEmail(title: string, body: string, ctaLabel: string, ctaUrl: string, footer?: string) {
  const url = escapeHtml(safeUrl(ctaUrl));
  return `<div style="font-family: Inter, Arial, sans-serif; background: #f8fafc; padding: 32px; color: #0f172a;"><div style="max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;"><div style="padding: 24px 28px; background: #020617; color: #fff;"><div style="font-size: 18px; font-weight: 700;">${PRODUCT_NAME}</div><div style="font-size: 13px; opacity: .82; margin-top: 4px;">AI compliance operations for growing teams</div></div><div style="padding: 28px;"><h1 style="font-size: 24px; line-height: 1.2; margin: 0 0 12px;">${escapeHtml(title)}</h1><p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 18px;">${body}</p><a href="${url}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;">${escapeHtml(ctaLabel)}</a></div><div style="padding: 18px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">${footer ?? `Message sent by ${PRODUCT_NAME}.`}</div></div></div>`;
}

function buildEmail(input: { template: EmailTemplateKey; subject: string; title: string; body: string; ctaLabel: string; ctaUrl: string; textLines: string[]; footer?: string; unsubscribeUrl?: string | null }): BuiltEmail {
  return {
    template: input.template,
    subject: input.subject,
    html: renderEmail(input.title, input.body, input.ctaLabel, input.ctaUrl, input.footer),
    text: [...input.textLines, `${input.ctaLabel}: ${safeUrl(input.ctaUrl)}`].join('\n\n'),
    unsubscribeUrl: input.unsubscribeUrl ?? null,
  };
}

export function welcomeOnboardingEmail(input: WelcomeOnboardingEmailInput): BuiltEmail {
  return buildEmail({ template: 'welcome_onboarding', subject: `Welcome to ${PRODUCT_NAME}`, title: `Welcome to ${PRODUCT_NAME}`, body: `Your ${escapeHtml(input.organizationName)} workspace is ready.`, ctaLabel: 'Start onboarding', ctaUrl: input.dashboardUrl, textLines: [`Welcome to ${PRODUCT_NAME}.`, `${input.organizationName} is ready.`] });
}

export function organizationCreatedEmail(input: OrganizationCreatedEmailInput): BuiltEmail {
  const createdBy = input.createdByName ? `Created by: ${input.createdByName}.` : 'The organization workspace has been created.';
  return buildEmail({ template: 'organization_created', subject: `${input.organizationName} has been created in ${PRODUCT_NAME}`, title: `${input.organizationName} has been created`, body: escapeHtml(createdBy), ctaLabel: 'Open organization', ctaUrl: input.organizationUrl, textLines: [`${input.organizationName} has been created in ${PRODUCT_NAME}.`, createdBy] });
}

export function memberInvitedEmail(input: MemberInvitedEmailInput): BuiltEmail {
  const invitedBy = input.invitedByName ? `${input.invitedByName} invited you` : 'You were invited';
  return buildEmail({ template: 'member_invited', subject: `Invitation to join ${input.organizationName} on ${PRODUCT_NAME}`, title: `Join ${input.organizationName} on ${PRODUCT_NAME}`, body: `${escapeHtml(invitedBy)} to join ${escapeHtml(input.organizationName)} as ${escapeHtml(input.role)}.`, ctaLabel: 'Review invitation', ctaUrl: input.inviteUrl, textLines: [`Invitation to join ${input.organizationName} on ${PRODUCT_NAME}.`, `Role: ${input.role}`] });
}

export function billingStartedEmail(input: BillingStartedEmailInput): BuiltEmail {
  return buildEmail({ template: 'billing_started', subject: `Billing started for ${input.organizationName}`, title: `Billing is active for ${input.organizationName}`, body: `Your ${PRODUCT_NAME} subscription is active on the ${escapeHtml(input.planName)} plan.`, ctaLabel: 'Open billing', ctaUrl: input.billingUrl, textLines: [`Billing started for ${input.organizationName}.`, `Plan: ${input.planName}`] });
}

export function invoiceFailedEmail(input: InvoiceFailedEmailInput): BuiltEmail {
  const details = [input.amountDue ? `Amount due: ${input.amountDue}` : null, input.dueDate ? `Due date: ${input.dueDate}` : null].filter(Boolean) as string[];
  return buildEmail({ template: 'invoice_failed', subject: `Billing issue detected for ${PRODUCT_NAME}`, title: `Billing issue detected for ${input.organizationName}`, body: escapeHtml(details.join(' · ') || 'Review billing status.'), ctaLabel: 'Open billing', ctaUrl: input.billingUrl, textLines: [`Billing issue detected for ${input.organizationName}.`, ...details] });
}

export function complianceDeadlineReminderEmail(input: ComplianceDeadlineReminderEmailInput): BuiltEmail {
  return buildEmail({ template: 'compliance_deadline_reminder', subject: `Compliance deadline reminder: ${input.deadlineName}`, title: 'Compliance deadline approaching', body: `Deadline: ${escapeHtml(input.deadlineName)}. Due date: ${escapeHtml(input.dueDate)}.`, ctaLabel: 'Review deadline', ctaUrl: input.dashboardUrl, textLines: [`Compliance deadline reminder for ${input.organizationName}.`, `Deadline: ${input.deadlineName}`, `Due date: ${input.dueDate}`], footer: input.unsubscribeUrl ? `Reminder sent by ${PRODUCT_NAME}.` : undefined, unsubscribeUrl: input.unsubscribeUrl });
}

export function exportReadyEmail(input: ExportReadyEmailInput): BuiltEmail {
  return buildEmail({ template: 'export_ready', subject: `Your ${input.exportName} export is ready`, title: 'Your export is ready', body: `The export ${escapeHtml(input.exportName)} has finished processing.`, ctaLabel: 'Open exports', ctaUrl: input.exportsUrl, textLines: [`Your ${input.exportName} export is ready.`, `Open ${PRODUCT_NAME}.`] });
}

export function securityAlertEmail(input: SecurityAlertEmailInput): BuiltEmail {
  const details = [`Occurred at: ${input.occurredAt}`, input.ipAddress ? `IP address: ${input.ipAddress}` : null, input.location ? `Location: ${input.location}` : null].filter(Boolean) as string[];
  return buildEmail({ template: 'security_alert', subject: `Security alert: ${input.alertTitle}`, title: input.alertTitle, body: escapeHtml(details.join(' · ')), ctaLabel: 'Review activity', ctaUrl: input.securityUrl, textLines: [`Security alert for ${input.organizationName}: ${input.alertTitle}`, ...details] });
}

export function trialUpgradeEmail(input: TrialUpgradeEmailInput): BuiltEmail {
  const days = input.daysRemaining ?? 3;
  return buildEmail({ template: 'trial_upgrade', subject: `Your ${PRODUCT_NAME} trial is ending`, title: `Your ${input.organizationName} trial is ending`, body: `Your trial has about ${days} day${days === 1 ? '' : 's'} remaining.`, ctaLabel: 'Review billing options', ctaUrl: input.billingUrl, textLines: [`Your ${input.organizationName} trial is ending.`, `Days remaining: ${days}`] });
}

export function documentExpiringEmail(input: DocumentExpiringEmailInput): BuiltEmail {
  return buildEmail({ template: 'document_expiring', subject: 'Document review required', title: `Document review required for ${input.organizationName}`, body: `Document: ${escapeHtml(input.documentName)}. Review date: ${escapeHtml(input.expiresAt)}.`, ctaLabel: 'Review documents', ctaUrl: input.documentsUrl, textLines: [`Document review required for ${input.organizationName}.`, `Document: ${input.documentName}`, `Review date: ${input.expiresAt}`] });
}

export function vendorReviewEmail(input: VendorReviewEmailInput): BuiltEmail {
  const dueText = input.reviewDueAt ? `Review due: ${input.reviewDueAt}.` : 'A vendor review is pending.';
  return buildEmail({ template: 'vendor_review', subject: 'Vendor review pending', title: `Vendor review pending for ${input.organizationName}`, body: `Vendor: ${escapeHtml(input.vendorName)}. ${escapeHtml(dueText)}`, ctaLabel: 'Review vendors', ctaUrl: input.vendorsUrl, textLines: [`Vendor review pending for ${input.organizationName}.`, `Vendor: ${input.vendorName}`, dueText] });
}

export const onboardingEmail = welcomeOnboardingEmail;
export const invitationEmail = memberInvitedEmail;
export const paymentFailedEmail = invoiceFailedEmail;
