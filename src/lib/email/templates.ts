type InvitationEmailInput = {
  organizationName: string;
  role: string;
  inviteUrl: string;
};

type OnboardingEmailInput = {
  organizationName: string;
  dashboardUrl: string;
};

function baseLayout(content: string) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; background: #f8fafc; padding: 32px; color: #0f172a;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="padding: 24px 28px; background: #020617; color: #ffffff;">
          <div style="font-size: 18px; font-weight: 700;">EuroComply</div>
          <div style="font-size: 13px; opacity: 0.8; margin-top: 4px;">Compliance operations for growing teams</div>
        </div>
        <div style="padding: 28px;">
          ${content}
        </div>
        <div style="padding: 18px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          This message was sent by EuroComply. If you were not expecting it, you can ignore it.
        </div>
      </div>
    </div>
  `;
}

function button(label: string, href: string) {
  return `<a href="${href}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600;">${label}</a>`;
}

export function invitationEmail(input: InvitationEmailInput) {
  const html = baseLayout(`
    <h1 style="font-size: 24px; line-height: 1.2; margin: 0 0 12px;">You have been invited to ${input.organizationName}</h1>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 18px;">
      You were invited to join ${input.organizationName} on EuroComply with the role <strong>${input.role}</strong>.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px;">
      Accept the invitation to collaborate on compliance tasks, documents, vendor reviews, risks and executive reports.
    </p>
    ${button('Accept invitation', input.inviteUrl)}
    <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin: 24px 0 0;">
      If the button does not work, copy and paste this URL into your browser:<br />
      <span style="word-break: break-all;">${input.inviteUrl}</span>
    </p>
  `);

  const text = [
    `You have been invited to ${input.organizationName} on EuroComply.`,
    `Role: ${input.role}`,
    `Accept invitation: ${input.inviteUrl}`,
  ].join('\n\n');

  return {
    subject: `Invitation to join ${input.organizationName} on EuroComply`,
    html,
    text,
  };
}

export function onboardingEmail(input: OnboardingEmailInput) {
  const html = baseLayout(`
    <h1 style="font-size: 24px; line-height: 1.2; margin: 0 0 12px;">${input.organizationName} is ready in EuroComply</h1>
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 18px;">
      Your workspace has been created. Start by adding compliance templates, uploading key documents and inviting teammates.
    </p>
    <ul style="font-size: 15px; line-height: 1.7; color: #334155; padding-left: 20px; margin: 0 0 24px;">
      <li>Create your first compliance tasks from templates.</li>
      <li>Upload evidence documents and set review dates.</li>
      <li>Add vendors and identify high-risk relationships.</li>
      <li>Review your executive dashboard before inviting leadership.</li>
    </ul>
    ${button('Open dashboard', input.dashboardUrl)}
  `);

  const text = [
    `${input.organizationName} is ready in EuroComply.`,
    'Next steps: create template tasks, upload evidence documents, add vendors and review your executive dashboard.',
    `Open dashboard: ${input.dashboardUrl}`,
  ].join('\n\n');

  return {
    subject: `${input.organizationName} is ready in EuroComply`,
    html,
    text,
  };
}
