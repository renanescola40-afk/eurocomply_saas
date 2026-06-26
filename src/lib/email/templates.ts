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

type BaseTemplateInput = {
  organizationName: string;
};

type WelcomeOnboardingEmailInput = BaseTemplateInput & {
  dashboardUrl: string;
};

type OrganizationCreatedEmailInput = BaseTemplateInput & {
  organizationUrl: string;
  createdByName?: string | null;
};

type MemberInvitedEmailInput = BaseTemplateInput & {
  role: string;
  inviteUrl: string;
  invitedByName?: string | null;
};

type BillingStartedEmailInput = BaseTemplateInput & {
  planName: string;
  billingUrl: string;
};

type InvoiceFailedEmailInput = BaseTemplateInput & {
  billingUrl: string;
  amountDue?: string | null;
  dueDate?: string | null;
};

type ComplianceDeadlineReminderEmailInput = BaseTemplateInput & {
  deadlineName: string;
  dueDate: string;
  dashboardUrl: string;
  unsubscribeUrl?: string | null;
};

type ExportReadyEmailInput = BaseTemplateInput & {
  exportName: string;
  exportsUrl: string;
};

type SecurityAlertEmailInput = BaseTemplateInput & {
  alertTitle: string;
  occurredAt: string;
  securityUrl: string;
  ipAddress?: string | null;
  location?: string | null;
};

type TrialUpgradeEmailInput = BaseTemplateInput & {
  billingUrl: string;
  daysRemaining?: number;
};

type DocumentExpiringEmailInput = BaseTemplateInput & {
  documentName: string;
  expiresAt: string;
  documentsUrl: string;
};

type VendorReviewEmailInput = BaseTemplateInput & {
  vendorName: string;
  vendorsUrl: string;
  reviewDueAt?: string | null;
};

type BuiltEmail = {
  template: EmailTemplateKey;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl?: string | null;
};

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

function getSafeFallbackUrl(value: string) {
  const safe = safeUrl(value);
  if (safe.includes('/invite/')) return 'Open RISCK COMPLY and use the invitation button in this message.';
  return safe;
}

function baseLayout(content: string, footer?: string) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; background: #f8fafc; padding: 32px; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="padding: 24px 28px; background: #020617; color: #ffffff;">
          <div style="font-size: 18px; font-weight: 700; letter-spacing: -0.02em;">RISCK COMPLY</div>
          <div style="font-size: 13px; opacity: 0.82; margin-top: 4px;">Compliance operations for growing teams</div>
        </div>
        <div style="padding: 28px;">
          ${content}
        </div>
        <div style="padding: 18px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
          ${footer ?? 'This transactional message was sent by RISCK COMPLY. It does not include passwords, API keys or secret tokens.'}
        </div>
      </div>
    </div>
  `;
}

function button(label: string, href: string) {
  const url = escapeHtml(safeUrl(href));
  return `<a href="${url}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;">${escapeHtml(label)}</a>`;
}

function paragraph(value: string) {
  return `<p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 18px;">${value}</p>`;
}

function fallbackLink(url: string) {
  const safe = escapeHtml(getSafeFallbackUrl(url));
  return `
    <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin: 24px 0 0;">
      If the button does not work, open RISCK COMPLY and navigate to the same area manually. For security, we do not print secret tokens in email bodies.<br />
      <span style="word-break: break-all;">${safe}</span>
    </p>
  `;
}

function buildEmail(input: {
  template: EmailTemplateKey;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  textLines: string[];
  subject: string;
  footer?: string;
  unsubscribeUrl?: string | null;
}): BuiltEmail {
  return {
    template: input.template,
    subject: input.subject,
    html: baseLayout(
      `
        <h1 style="font-size: 24px; line-height: 1.2; margin: 0 0 12px;">${escapeHtml(input.title)}</h1>
        ${input.body}
        ${button(input.ctaLabel, input.ctaUrl)}
        ${fallbackLink(input.ctaUrl)}
      `,
      input.footer,
    ),
    text: [...input.textLines, `${input.ctaLabel}: ${getSafeFallbackUrl(input.ctaUrl)}`].join('\n\n'),
    unsubscribeUrl: input.unsubscribeUrl ?? null,
  };
}

export function welcomeOnboardingEmail(input: WelcomeOnboardingEmailInput): BuiltEmail {
  return buildEmail({
    template: 'welcome_onboarding',
    subject: 'Welcome to RISCK COMPLY',
    title: `Welcome to RISCK COMPLY`,
    body: `
      ${paragraph(`Your ${escapeHtml(input.organizationName)} workspace is ready. Start with the setup checklist and invite the people who own compliance, security, legal and finance.`)}
      <ul style="font-size: 15px; line-height: 1.7; color: #334155; padding-left: 20px; margin: 0 0 24px;">
        <li>Create your first compliance tasks from templates.</li>
        <li>Upload evidence documents and assign owners.</li>
        <li>Register vendors and map AI/compliance risk.</li>
        <li>Review your executive dashboard before sharing leadership reports.</li>
      </ul>
    `,
    ctaLabel: 'Start onboarding',
    ctaUrl: input.dashboardUrl,
    textLines: [
      `Welcome to RISCK COMPLY.`,
      `${input.organizationName} is ready. Start with tasks, evidence, vendors, risks and the executive dashboard.`,
    ],
  });
}

export function organizationCreatedEmail(input: OrganizationCreatedEmailInput): BuiltEmail {
  const createdBy = input.createdByName ? `Created by: ${input.createdByName}.` : 'The organization workspace has been created.';

  return buildEmail({
    template: 'organization_created',
    subject: `${input.organizationName} has been created in RISCK COMPLY`,
    title: `${input.organizationName} has been created`,
    body: [
      paragraph(escapeHtml(createdBy)),
      paragraph('You can now configure owners, members, billing, compliance frameworks, evidence retention and security settings.'),
    ].join(''),
    ctaLabel: 'Open organization',
    ctaUrl: input.organizationUrl,
    textLines: [`${input.organizationName} has been created in RISCK COMPLY.`, createdBy],
  });
}

export function memberInvitedEmail(input: MemberInvitedEmailInput): BuiltEmail {
  const invitedBy = input.invitedByName ? `${input.invitedByName} invited you` : 'You were invited';

  return buildEmail({
    template: 'member_invited',
    subject: `Invitation to join ${input.organizationName} on RISCK COMPLY`,
    title: `Join ${input.organizationName} on RISCK COMPLY`,
    body: [
      paragraph(`${escapeHtml(invitedBy)} to join ${escapeHtml(input.organizationName)} with the role <strong>${escapeHtml(input.role)}</strong>.`),
      paragraph('Accept the invitation from the secure app page. The email avoids printing invitation tokens or private secrets in the body.'),
    ].join(''),
    ctaLabel: 'Review invitation',
    ctaUrl: input.inviteUrl,
    textLines: [`Invitation to join ${input.organizationName} on RISCK COMPLY.`, `Role: ${input.role}`],
  });
}

export function billingStartedEmail(input: BillingStartedEmailInput): BuiltEmail {
  return buildEmail({
    template: 'billing_started',
    subject: `Billing started for ${input.organizationName}`,
    title: `Billing is active for ${input.organizationName}`,
    body: [
      paragraph(`Your RISCK COMPLY subscription is now active on the <strong>${escapeHtml(input.planName)}</strong> plan.`),
      paragraph('Invoices and payment methods are managed through the secure billing portal. No card details are included in this email.'),
    ].join(''),
    ctaLabel: 'Open billing',
    ctaUrl: input.billingUrl,
    textLines: [`Billing started for ${input.organizationName}.`, `Plan: ${input.planName}`],
  });
}

export function invoiceFailedEmail(input: InvoiceFailedEmailInput): BuiltEmail {
  const details = [input.amountDue ? `Amount due: ${input.amountDue}` : null, input.dueDate ? `Due date: ${input.dueDate}` : null].filter(Boolean);

  return buildEmail({
    template: 'invoice_failed',
    subject: 'Payment issue detected for RISCK COMPLY',
    title: `Payment issue detected for ${input.organizationName}`,
    body: [
      paragraph('Stripe reported a payment issue for your RISCK COMPLY subscription.'),
      details.length ? paragraph(escapeHtml(details.join(' · '))) : '',
      paragraph('Please update the payment method or review the subscription status to avoid interruption to paid plan access.'),
    ].join(''),
    ctaLabel: 'Open billing',
    ctaUrl: input.billingUrl,
    textLines: [`Payment issue detected for ${input.organizationName}.`, ...details, 'Open billing to update the payment method or review subscription status.'],
  });
}

export function complianceDeadlineReminderEmail(input: ComplianceDeadlineReminderEmailInput): BuiltEmail {
  return buildEmail({
    template: 'compliance_deadline_reminder',
    subject: `Compliance deadline reminder: ${input.deadlineName}`,
    title: `Compliance deadline approaching`,
    body: [
      paragraph(`Deadline: <strong>${escapeHtml(input.deadlineName)}</strong>.`),
      paragraph(`Due date: <strong>${escapeHtml(input.dueDate)}</strong>. Review owners, evidence and remaining tasks before the deadline.`),
    ].join(''),
    ctaLabel: 'Review deadline',
    ctaUrl: input.dashboardUrl,
    textLines: [`Compliance deadline reminder for ${input.organizationName}.`, `Deadline: ${input.deadlineName}`, `Due date: ${input.dueDate}`],
    footer: input.unsubscribeUrl
      ? `This reminder was sent by RISCK COMPLY. You can manage reminder preferences here: <a href="${escapeHtml(safeUrl(input.unsubscribeUrl))}">notification settings</a>.`
      : undefined,
    unsubscribeUrl: input.unsubscribeUrl,
  });
}

export function exportReadyEmail(input: ExportReadyEmailInput): BuiltEmail {
  return buildEmail({
    template: 'export_ready',
    subject: `Your ${input.exportName} export is ready`,
    title: `Your export is ready`,
    body: [
      paragraph(`The export <strong>${escapeHtml(input.exportName)}</strong> has finished processing.`),
      paragraph('Open the exports page to download it from the authenticated app. The file itself is not attached to this email.'),
    ].join(''),
    ctaLabel: 'Open exports',
    ctaUrl: input.exportsUrl,
    textLines: [`Your ${input.exportName} export is ready.`, 'Open RISCK COMPLY to download it securely.'],
  });
}

export function securityAlertEmail(input: SecurityAlertEmailInput): BuiltEmail {
  const details = [
    `Occurred at: ${input.occurredAt}`,
    input.ipAddress ? `IP address: ${input.ipAddress}` : null,
    input.location ? `Location: ${input.location}` : null,
  ].filter(Boolean) as string[];

  return buildEmail({
    template: 'security_alert',
    subject: `Security alert: ${input.alertTitle}`,
    title: input.alertTitle,
    body: [
      paragraph(`A security-sensitive activity was detected for <strong>${escapeHtml(input.organizationName)}</strong>.`),
      paragraph(escapeHtml(details.join(' · '))),
      paragraph('Review activity from the secure app. If this was not expected, rotate affected credentials and contact support.'),
    ].join(''),
    ctaLabel: 'Review security activity',
    ctaUrl: input.securityUrl,
    textLines: [`Security alert for ${input.organizationName}: ${input.alertTitle}`, ...details],
  });
}

export function trialUpgradeEmail(input: TrialUpgradeEmailInput): BuiltEmail {
  const days = input.daysRemaining ?? 3;

  return buildEmail({
    template: 'trial_upgrade',
    subject: 'Your RISCK COMPLY trial is ending',
    title: `Your ${input.organizationName} trial is ending`,
    body: [
      paragraph(`Your RISCK COMPLY trial has about <strong>${days} day${days === 1 ? '' : 's'}</strong> remaining.`),
      paragraph('Upgrade now to keep access to compliance tasks, evidence documents, vendors, risks, reports and billing controls without interruption.'),
    ].join(''),
    ctaLabel: 'Review billing options',
    ctaUrl: input.billingUrl,
    textLines: [`Your ${input.organizationName} trial is ending.`, `Days remaining: ${days}`],
  });
}

export function documentExpiringEmail(input: DocumentExpiringEmailInput): BuiltEmail {
  return buildEmail({
    template: 'document_expiring',
    subject: 'Document review required',
    title: `Document review required for ${input.organizationName}`,
    body: [
      paragraph(`The document <strong>${escapeHtml(input.documentName)}</strong> is approaching its review or expiry date.`),
      paragraph(`Review date: <strong>${escapeHtml(input.expiresAt)}</strong>. Upload a refreshed version or confirm the document is still valid.`),
    ].join(''),
    ctaLabel: 'Review documents',
    ctaUrl: input.documentsUrl,
    textLines: [`Document review required for ${input.organizationName}.`, `Document: ${input.documentName}`, `Review date: ${input.expiresAt}`],
  });
}

export function vendorReviewEmail(input: VendorReviewEmailInput): BuiltEmail {
  const dueText = input.reviewDueAt ? `Review due: <strong>${escapeHtml(input.reviewDueAt)}</strong>.` : 'A vendor review is pending.';

  return buildEmail({
    template: 'vendor_review',
    subject: 'Vendor review pending',
    title: `Vendor review pending for ${input.organizationName}`,
    body: [
      paragraph(`The vendor <strong>${escapeHtml(input.vendorName)}</strong> requires compliance review.`),
      paragraph(`${dueText} Confirm DPA status, data access level, risk level and security evidence.`),
    ].join(''),
    ctaLabel: 'Review vendors',
    ctaUrl: input.vendorsUrl,
    textLines: [
      `Vendor review pending for ${input.organizationName}.`,
      `Vendor: ${input.vendorName}`,
      input.reviewDueAt ? `Review due: ${input.reviewDueAt}` : 'A vendor review is pending.',
    ],
  });
}

export const onboardingEmail = welcomeOnboardingEmail;
export const invitationEmail = memberInvitedEmail;
export const paymentFailedEmail = invoiceFailedEmail;
