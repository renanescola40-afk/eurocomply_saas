export type ActivationEmailDay = 0 | 1 | 3 | 7;

export type ActivationEmailInput = {
  organizationName: string;
  dashboardUrl: string;
  documentsUrl: string;
  risksUrl: string;
  vendorsUrl: string;
  billingUrl: string;
  onboardingCallUrl?: string | null;
};

type ActivationEmail = {
  day: ActivationEmailDay;
  subject: string;
  preview: string;
  text: string;
};

function callUrl(input: ActivationEmailInput) {
  return input.onboardingCallUrl || input.billingUrl;
}

export function buildActivationEmail(input: ActivationEmailInput, day: ActivationEmailDay): ActivationEmail {
  const organization = input.organizationName || 'your organization';

  if (day === 0) {
    return {
      day,
      subject: 'Welcome to RISCK COMPLY',
      preview: 'Create the workspace and reach first compliance value in minutes.',
      text: [
        `Welcome to RISCK COMPLY for ${organization}.`,
        'Your first goal is simple: create the organization, add one document, one risk and one vendor, then open the dashboard.',
        `Start here: ${input.dashboardUrl}`,
      ].join('\n\n'),
    };
  }

  if (day === 1) {
    return {
      day,
      subject: 'Set up your first compliance workspace',
      preview: 'Invite one teammate and add the first evidence item.',
      text: [
        `Quick setup checklist for ${organization}:`,
        '1. Invite one stakeholder from compliance, legal, security or finance.',
        '2. Upload the first useful document.',
        '3. Create the first risk with owner and mitigation action.',
        `Documents: ${input.documentsUrl}`,
        `Risks: ${input.risksUrl}`,
      ].join('\n\n'),
    };
  }

  if (day === 3) {
    return {
      day,
      subject: 'Your compliance checklist is almost useful',
      preview: 'Add vendor context so the dashboard tells a stronger story.',
      text: [
        `${organization} is ready for a stronger compliance view.`,
        'Add one vendor and review the dashboard. This helps leadership see exposure, evidence and next actions in one place.',
        `Vendors: ${input.vendorsUrl}`,
        `Dashboard: ${input.dashboardUrl}`,
      ].join('\n\n'),
    };
  }

  return {
    day,
    subject: 'Want help turning RISCK COMPLY into your operating system?',
    preview: 'Book an onboarding session and review upgrade options.',
    text: [
      `Let us help ${organization} finish activation.`,
      'Bring one document, one risk and one vendor. We will help shape the workspace into a structured compliance operations view for evidence preparation and internal review.',
      `Book onboarding: ${callUrl(input)}`,
      `Billing options: ${input.billingUrl}`,
    ].join('\n\n'),
  };
}

export function buildActivationEmailSequence(input: ActivationEmailInput) {
  return [0, 1, 3, 7].map((day) => buildActivationEmail(input, day as ActivationEmailDay));
}
