import type { Locale } from '@/lib/i18n/routing';

type QA = { question: string; answer: string };
type Proof = { title: string; body: string };
type PlanPresentationCopy = { eyebrow: string; description: string; cta: string };

type PricingCopy = {
  navLabel: string;
  enterprise: string;
  trust: string;
  signIn: string;
  startTrial: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  startProfessional: string;
  bookDemo: string;
  reviewTrust: string;
  guardrailEyebrow: string;
  guardrailTitle: string;
  guardrailBody: string;
  plansLabel: string;
  plan: Record<'starter' | 'professional' | 'business' | 'enterprise', PlanPresentationCopy>;
  from: string;
  month: string;
  contract: string;
  unlimited: string;
  includedUser: string;
  includedUsers: string;
  organization: string;
  organizations: string;
  aiSystem: string;
  aiSystems: string;
  usersByContract: string;
  organizationsByContract: string;
  unlimitedAuditHistory: string;
  enterpriseAuditHistory: string;
  dayAuditHistory: (days: string) => string;
  salesLedContract: string;
  demoAssisted: string;
  selfServeTrial: string;
  selfServe: string;
  limitsAria: (plan: string) => string;
  taxNote: string;
  valueProofLabel: string;
  valueProof: Proof[];
  comparisonEyebrow: string;
  comparisonTitle: string;
  capability: string;
  monthlyReference: string;
  organizationsLabel: string;
  aiSystemsLabel: string;
  auditHistory: string;
  commercialMotion: string;
  objectionsEyebrow: string;
  objectionsTitle: string;
  objections: QA[];
  faqEyebrow: string;
  faqs: QA[];
};

type CheckoutCopy = {
  navLabel: string;
  plans: string;
  billing: string;
  talkToSales: string;
  signIn: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  cancelledTitle: string;
  cancelledBody: string;
  errorTitle: string;
  errorBody: string;
  salesLedTitle: (plan: string) => string;
  salesLedBody: string;
  currentTitle: string;
  currentBody: string;
  proof: Proof[];
  orderSummary: string;
  salesLedSummary: string;
  monthlySummary: string;
  currentBadge: string;
  salesLedBadge: string;
  selectedBadge: string;
  month: string;
  contactSales: string;
  byContract: string;
  users: string;
  documents: string;
  vendors: string;
  risks: string;
  currentPlan: string;
  workspace: string;
  salesLedActivation: string;
  continueSecureCheckout: string;
  createWorkspace: string;
  createAccount: string;
  signInContinue: string;
  flowEyebrow: string;
  flowTitle: string;
  steps: string[];
  salesLed: string;
  perMonth: string;
};

type ConsentCopy = { title: string; body: string; decline: string; allow: string };

type LoginCopy = {
  badge: string;
  title: string;
  subtitle: string;
  google: string;
  divider: string;
  email: string;
  password: string;
  forgot: string;
  submit: string;
  loading: string;
  createPrompt: string;
  create: string;
  authLoading: string;
  failed: string;
  googleFailed: string;
  accessNote: string;
};

type SignupCopy = {
  eyebrow: string;
  sideEyebrow: string;
  sideTitle: string;
  sideBody: string;
  title: string;
  subtitle: string;
  choosePlanTitle: string;
  choosePlanSubtitle: string;
  selectPlan: string;
  selectedPlan: string;
  salesLed: string;
  salesLedTitle: string;
  salesLedSubtitle: string;
  google: string;
  divider: string;
  email: string;
  password: string;
  submit: string;
  loading: string;
  verifyTitle: string;
  verifySubtitle: string;
  haveAccount: string;
  signIn: string;
  authLoading: string;
  authExchangeFailed: string;
  fallbackError: string;
  from: string;
  month: string;
  contactSales: string;
};

export type CommercialSurfaceCopy = {
  pricing: PricingCopy;
  checkout: CheckoutCopy;
  consent: ConsentCopy;
  login: LoginCopy;
  signup: SignupCopy;
};

const en: CommercialSurfaceCopy = {
  pricing: {
    navLabel: 'Pricing navigation',
    enterprise: 'Enterprise',
    trust: 'Trust Center',
    signIn: 'Sign in',
    startTrial: 'Start trial',
    heroEyebrow: 'Transparent AI governance pricing',
    heroTitle: 'Start with AI readiness. Scale into enterprise governance.',
    heroSubtitle: 'Choose the plan that matches your AI footprint: from first inventory to multi-team governance workflows and enterprise controls.',
    startProfessional: 'Start Professional Trial',
    bookDemo: 'Book a Demo',
    reviewTrust: 'Review Trust Center',
    guardrailEyebrow: 'Commercial guardrail',
    guardrailTitle: 'Operational readiness, not legal guarantees.',
    guardrailBody: 'RISCK COMPLY supports AI governance readiness, evidence preparation and audit workflows. It is not legal advice, does not replace legal counsel and does not guarantee regulatory compliance.',
    plansLabel: 'Pricing plans',
    plan: {
      starter: { eyebrow: 'Starter workspace', description: 'For small teams replacing spreadsheets with a controlled AI governance workspace.', cta: 'Start Essential' },
      professional: { eyebrow: 'Best for readiness', description: 'For B2B teams preparing structured AI Act readiness evidence.', cta: 'Start Professional Trial' },
      business: { eyebrow: 'Multi-team rollout', description: 'For companies operating AI workflows across departments or business units.', cta: 'Book Business Demo' },
      enterprise: { eyebrow: 'Contract enterprise', description: 'For regulated teams needing advanced identity, RBAC, onboarding and agreed support terms.', cta: 'Talk to Sales' },
    },
    from: 'From',
    month: '/mo',
    contract: 'Contract',
    unlimited: 'Unlimited',
    includedUser: 'included user',
    includedUsers: 'included users',
    organization: 'organization',
    organizations: 'organizations',
    aiSystem: 'AI system',
    aiSystems: 'AI systems',
    usersByContract: 'Users by contract',
    organizationsByContract: 'Organizations by contract',
    unlimitedAuditHistory: 'Unlimited audit history',
    enterpriseAuditHistory: 'Audit retention by enterprise policy',
    dayAuditHistory: (days) => `${days}-day audit history`,
    salesLedContract: 'Sales-led / contract',
    demoAssisted: 'Demo / assisted sales',
    selfServeTrial: 'Self-serve trial',
    selfServe: 'Self-serve',
    limitsAria: (plan) => `${plan} included limits`,
    taxNote: 'Prices are shown in EUR. Taxes or VAT, where applicable, are confirmed during checkout or in the applicable order form. Business is assisted-sales; Enterprise uses negotiated contract pricing.',
    valueProofLabel: 'Pricing value proof',
    valueProof: [
      { title: 'Know your AI footprint', body: 'Create a clear record of AI systems, owners, use cases, departments, countries and vendors.' },
      { title: 'Classify risk without chaos', body: 'Turn vague AI concerns into structured risk signals, ownership and next actions.' },
      { title: 'Prepare evidence before pressure', body: 'Organize governance evidence and review activity without claiming legal guarantees.' },
    ],
    comparisonEyebrow: 'Plan comparison',
    comparisonTitle: 'Compare canonical capacity and commercial motion.',
    capability: 'Capability',
    monthlyReference: 'Monthly reference',
    organizationsLabel: 'Organizations',
    aiSystemsLabel: 'AI systems',
    auditHistory: 'Audit history',
    commercialMotion: 'Commercial motion',
    objectionsEyebrow: 'Objections',
    objectionsTitle: 'Strong answers without unsafe promises.',
    objections: [
      { question: 'Does this guarantee EU AI Act compliance?', answer: 'No. RISCK COMPLY supports operational readiness, evidence preparation and governance workflows. Final legal interpretation remains with your legal counsel and advisors.' },
      { question: 'We already have spreadsheets.', answer: 'RISCK COMPLY gives AI inventory, ownership, evidence status and review history a controlled system of record.' },
      { question: 'Do you replace lawyers or DPOs?', answer: 'No. The platform helps legal, compliance, DPO, security and product teams work from the same operating evidence.' },
    ],
    faqEyebrow: 'Commercial FAQ',
    faqs: [
      { question: 'Which plan should we start with?', answer: 'Essential is for a first controlled workspace. Professional is the default for structured readiness. Business is for multi-team rollout. Enterprise is procurement-led.' },
      { question: 'Do you offer a trial?', answer: 'Professional is the recommended trial motion. Business and Enterprise should start with a demo.' },
      { question: 'How is Enterprise priced?', answer: 'Enterprise uses negotiated contract pricing. The public starting reference is from €990/month; final pricing depends on scope, rollout, support and agreed commercial terms.' },
    ],
  },
  checkout: {
    navLabel: 'Checkout navigation',
    plans: 'Plans', billing: 'Billing', talkToSales: 'Talk to sales', signIn: 'Sign in',
    heroEyebrow: 'Secure SaaS checkout', heroTitle: 'Activate your RISCK COMPLY workspace.',
    heroSubtitle: 'Select a monthly self-serve plan, confirm billing data in Stripe, or route assisted and Enterprise procurement through a sales-led rollout.',
    cancelledTitle: 'Checkout cancelled', cancelledBody: 'No billing change was made. Review the plan and restart checkout when you are ready.',
    errorTitle: 'Checkout could not start', errorBody: 'Please confirm you are signed in, have a workspace and can manage billing for this organization.',
    salesLedTitle: (plan) => `${plan} is sales-led`, salesLedBody: 'This plan requires rollout scope and agreed commercial terms before subscription activation.',
    currentTitle: 'This is already your current plan', currentBody: 'Open the billing portal if you need to manage invoices, payment details or subscription changes.',
    proof: [
      { title: 'Stripe secure billing', body: 'Card, invoice details, tax IDs and billing addresses are handled by Stripe Checkout.' },
      { title: 'Workspace-linked subscription', body: 'The selected plan is connected to your organization after Stripe confirms the subscription.' },
      { title: 'Transparent monthly pricing', body: 'The plan price comes from the SaaS billing catalog, with no hidden setup fee.' },
    ],
    orderSummary: 'Order summary', salesLedSummary: 'Sales-led compliance rollout for procurement-driven teams.', monthlySummary: 'Monthly subscription for your compliance workspace.',
    currentBadge: 'Current', salesLedBadge: 'Sales-led', selectedBadge: 'Selected', month: '/mo', contactSales: 'Contact sales', byContract: 'By contract',
    users: 'Users', documents: 'Documents', vendors: 'Vendors', risks: 'Risks', currentPlan: 'Current plan', workspace: 'Workspace',
    salesLedActivation: 'Sales-led subscriptions are activated after commercial approval.', continueSecureCheckout: 'Continue to secure checkout', createWorkspace: 'Create workspace before checkout', createAccount: 'Create account and continue', signInContinue: 'Sign in to continue',
    flowEyebrow: 'Checkout flow', flowTitle: 'A polished handoff, not a generic payment link.',
    steps: ['Choose the plan that matches your current compliance workload.', 'Confirm billing details in Stripe Checkout for self-serve plans, or talk to sales for assisted and contract plans.', 'Return to the RISCK COMPLY dashboard with the plan connected to your workspace.'],
    salesLed: 'sales-led', perMonth: 'per month',
  },
  consent: {
    title: 'Privacy-first product analytics',
    body: 'Help us improve RISCK COMPLY by sharing privacy-safe usage analytics. We do not capture document contents, risk notes, vendor names, form inputs or compliance data.',
    decline: 'Decline', allow: 'Allow',
  },
  login: {
    badge: 'Secure workspace access', title: 'Sign in to RISCK COMPLY', subtitle: 'Continue with Google, work email or Enterprise SSO.',
    google: 'Continue with Google', divider: 'or sign in with email', email: 'Work email', password: 'Password', forgot: 'Forgot your password?', submit: 'Sign in securely', loading: 'Signing in...',
    createPrompt: 'No account yet?', create: 'Create account', authLoading: 'Authentication is still loading. Please try again in a moment.', failed: 'Could not sign in. Check your details and try again.', googleFailed: 'Could not start Google sign-in. Please try again.',
    accessNote: 'New accounts complete onboarding and secure Stripe payment before accessing the SaaS.',
  },
  signup: {
    eyebrow: 'Secure signup', sideEyebrow: 'AI Act onboarding', sideTitle: 'Start with plan, organization and onboarding in the right order.', sideBody: 'New accounts choose a plan first, create the account and enter onboarding to configure the company.',
    title: 'Create your RISCK COMPLY account', subtitle: 'Choose a plan before creating the account. Then we guide you through company onboarding.', choosePlanTitle: 'Choose the new account plan', choosePlanSubtitle: 'Every new account starts with a selected plan so billing and onboarding stay aligned.',
    selectPlan: 'Select plan', selectedPlan: 'Selected plan', salesLed: 'Talk to sales', salesLedTitle: 'This plan is sales-led', salesLedSubtitle: 'We agree rollout scope and commercial terms before subscription activation.',
    google: 'Create account with Google', divider: 'or create with email', email: 'Work email', password: 'Password', submit: 'Create account', loading: 'Creating...', verifyTitle: 'Verify your email', verifySubtitle: 'We sent a confirmation link. Then sign in to continue onboarding.',
    haveAccount: 'Already have an account?', signIn: 'Sign in', authLoading: 'Authentication is still loading. Please try again in a moment.', authExchangeFailed: 'Could not complete account creation. Please try again.', fallbackError: 'Could not create the account. Please try again.',
    from: 'From', month: '/mo', contactSales: 'Contact sales',
  },
};

function mergePricing(overrides: Partial<Omit<PricingCopy, 'plan'>> & { plan?: Partial<PricingCopy['plan']> }): PricingCopy {
  return { ...en.pricing, ...overrides, plan: { ...en.pricing.plan, ...overrides.plan } };
}

function makeLocale(input: {
  pricing: Partial<Omit<PricingCopy, 'plan'>> & { plan?: Partial<PricingCopy['plan']> };
  checkout: Partial<CheckoutCopy>;
  consent: ConsentCopy;
  login: LoginCopy;
  signup: SignupCopy;
}): CommercialSurfaceCopy {
  return {
    pricing: mergePricing(input.pricing),
    checkout: { ...en.checkout, ...input.checkout },
    consent: input.consent,
    login: input.login,
    signup: input.signup,
  };
}

export const commercialSurfaceCopy: Record<Locale, CommercialSurfaceCopy> = {
  en,
  pt: en,
  es: en,
  fr: en,
  it: en,
  de: en,
};

export function getCommercialSurfaceCopy(_locale: Locale) {
  return en;
}
