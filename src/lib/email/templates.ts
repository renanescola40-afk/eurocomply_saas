type InvitationEmailInput = {
  organizationName: string;
  role: string;
  inviteUrl: string;
};

type OnboardingEmailInput = {
  organizationName: string;
  dashboardUrl: string;
};

type TrialUpgradeEmailInput = {
  organizationName: string;
  billingUrl: string;
  daysRemaining?: number;
};

type PaymentFailedEmailInput = {
  organizationName: string;
  billingUrl: string;
};

type DocumentExpiringEmailInput = {
  organizationName: string;
  documentName: string;
  expiresAt: string;
  documentsUrl: string;
};

type VendorReviewEmailInput = {
  organizationName: string;
  vendorName: string;
  vendorsUrl: string;
  reviewDueAt?: string | null;
};

function baseLayout(content: string) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; background: #f8fafc; padding: 32px; color: #0f172a;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="padding: 24px 28px; background: #020617; color: #ffffff;">
          <div style="font-size: 18px; font-weight: 700;">RISCK COMPLY</div>
          <div style="font-size: 13px; opacity: 0.8; margin-top: 4px;">Compliance operations for growing teams</div>
        </div>
        <div style="padding: 28px;">
          ${content}
        </div>
        <div style="padding: 18px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          This message was sent by RISCK COMPLY. If you were not expecting it, you can ignore it.
        </div>
      </div>
    </div>
  `;
}

function button(label: string, href: string) {
  return `<a href="${href}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;">${label}</a>`;
}

function paragraph(value: string) {
  return `<p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 18px;">${value}</p>`;
}

function fallbackLink(url: string) {
  return `
    <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin: 24px 0 0;">
      If the button does not work, copy and paste this URL into your browser:<br />
      <span style="word-break: break-all;">${url}</span>
    </p>
  `;
}

function buildEmail(input: { title: string; body: string; ctaLabel: string; ctaUrl: string; textLines: string[]; subject: string }) {
  return {
    subject: input.subject,
    html: baseLayout(`
      <h1 style="font-size: 24px; line-height: 1.2; margin: 0 0 12px;">${input.title}</h1>
      ${input.body}
      ${button(input.ctaLabel, input.ctaUrl)}
      ${fallbackLink(input.ctaUrl)}
    `),
    text: [...input.textLines, `${input.ctaLabel}: ${input.ctaUrl}`].join('\n\n'),
  };
}

export function invitationEmail(input: InvitationEmailInput) {
  return buildEmail({
    subject: `Invitation to join ${input.organizationName} on RISCK COMPLY`,
    title: `You have been invited to ${input.organizationName}`,
    body: [
      paragraph(`You were invited to join ${input.organizationName} on RISCK COMPLY with the role <strong>${input.role}</strong>.`),
      paragraph('Accept the invitation to collaborate on compliance tasks, documents, vendor reviews, risks and executive reports.'),
    ].join(''),
    ctaLabel: 'Accept invitation',
    ctaUrl: input.inviteUrl,
    textLines: [`You have been invited to ${input.organizationName} on RISCK COMPLY.`, `Role: ${input.role}`],
  });
}

export function onboardingEmail(input: OnboardingEmailInput) {
  return buildEmail({
    subject: `${input.organizationName} is ready in RISCK COMPLY`,
    title: `${input.organizationName} is ready in RISCK COMPLY`,
    body: `
      ${paragraph('Your workspace has been created. Start by adding compliance templates, uploading key documents and inviting teammates.')}
      <ul style="font-size: 15px; line-height: 1.7; color: #334155; padding-left: 20px; margin: 0 0 24px;">
        <li>Create your first compliance tasks from templates.</li>
        <li>Upload evidence documents and set review dates.</li>
        <li>Add vendors and identify high-risk relationships.</li>
        <li>Review your executive dashboard before inviting leadership.</li>
      </ul>
    `,
    ctaLabel: 'Open dashboard',
    ctaUrl: input.dashboardUrl,
    textLines: [
      `${input.organizationName} is ready in RISCK COMPLY.`,
      'Next steps: create template tasks, upload evidence documents, add vendors and review your executive dashboard.',
    ],
  });
}

export function trialUpgradeEmail(input: TrialUpgradeEmailInput) {
  const days = input.daysRemaining ?? 3;

  return buildEmail({
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

export function paymentFailedEmail(input: PaymentFailedEmailInput) {
  return buildEmail({
    subject: 'Payment issue detected for RISCK COMPLY',
    title: `Payment issue detected for ${input.organizationName}`,
    body: [
      paragraph('Stripe reported a payment issue for your RISCK COMPLY subscription.'),
      paragraph('Please update the payment method or review the subscription status to avoid interruption to paid plan access.'),
    ].join(''),
    ctaLabel: 'Open billing',
    ctaUrl: input.billingUrl,
    textLines: [`Payment issue detected for ${input.organizationName}.`, 'Open billing to update the payment method or review subscription status.'],
  });
}

export function documentExpiringEmail(input: DocumentExpiringEmailInput) {
  return buildEmail({
    subject: 'Document review required',
    title: `Document review required for ${input.organizationName}`,
    body: [
      paragraph(`The document <strong>${input.documentName}</strong> is approaching its review or expiry date.`),
      paragraph(`Review date: <strong>${input.expiresAt}</strong>. Upload a refreshed version or confirm the document is still valid.`),
    ].join(''),
    ctaLabel: 'Review documents',
    ctaUrl: input.documentsUrl,
    textLines: [`Document review required for ${input.organizationName}.`, `Document: ${input.documentName}`, `Review date: ${input.expiresAt}`],
  });
}

export function vendorReviewEmail(input: VendorReviewEmailInput) {
  const dueText = input.reviewDueAt ? `Review due: <strong>${input.reviewDueAt}</strong>.` : 'A vendor review is pending.';

  return buildEmail({
    subject: 'Vendor review pending',
    title: `Vendor review pending for ${input.organizationName}`,
    body: [
      paragraph(`The vendor <strong>${input.vendorName}</strong> requires compliance review.`),
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
