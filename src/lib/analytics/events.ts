export const analyticsEvents = {
  userSignedUp: 'user_signed_up',
  userSignedIn: 'user_signed_in',
  organizationCreated: 'organization_created',
  organizationSetupStarted: 'organization_setup_started',
  organizationSwitched: 'organization_switched',
  dashboardOpened: 'dashboard_opened',
  onboardingChecklistViewed: 'onboarding_checklist_viewed',
  onboardingStepClicked: 'onboarding_step_clicked',
  onboardingDemoLoaded: 'onboarding_demo_loaded',
  onboardingCallBooked: 'onboarding_call_booked',
  trialBannerViewed: 'trial_banner_viewed',
  upgradeCtaClicked: 'upgrade_cta_clicked',
  teamMemberInviteStarted: 'team_member_invite_started',
  documentUploaded: 'document_uploaded',
  riskCreated: 'risk_created',
  vendorCreated: 'vendor_created',
  checkoutStarted: 'checkout_started',
  checkoutCompleted: 'checkout_completed',
  subscriptionActive: 'subscription_active',
  subscriptionCancelled: 'subscription_cancelled',
} as const;

export type AnalyticsEventName = (typeof analyticsEvents)[keyof typeof analyticsEvents];

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

const sensitiveKeyPatterns = [
  /email/i,
  /name/i,
  /company/i,
  /document/i,
  /filename/i,
  /file/i,
  /content/i,
  /description/i,
  /summary/i,
  /notes?/i,
  /comment/i,
  /risk[_-]?detail/i,
  /vendor[_-]?name/i,
  /tax/i,
  /vat/i,
  /iban/i,
  /address/i,
  /phone/i,
  /token/i,
  /secret/i,
  /password/i,
];

const allowedKeys = new Set([
  'source',
  'locale',
  'path',
  'plan',
  'tier',
  'status',
  'role',
  'actor_role',
  'step',
  'event_source',
  'organization_id',
  'clerk_org_id',
  'organizationId',
  'clerkOrgId',
  'stripe_customer_id',
  'stripe_subscription_id',
  'stripe_session_id',
  'checkout_session_id',
  'subscription_id',
  'livemode',
  'is_trial',
  'has_organization',
  'has_members',
  'has_documents',
  'has_risks',
  'has_vendors',
  'has_dashboard_opened',
  'onboarding_progress',
  'days_remaining',
  'count',
  'schema_version',
]);

export function sanitizeAnalyticsProperties(properties: AnalyticsProperties = {}) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (value === undefined) return false;
      if (allowedKeys.has(key)) return true;
      if (sensitiveKeyPatterns.some((pattern) => pattern.test(key))) return false;
      return typeof value === 'boolean' || typeof value === 'number';
    }),
  ) as AnalyticsProperties;
}

export function buildGroupProperties(organizationId?: string | null, clerkOrgId?: string | null) {
  const id = clerkOrgId || organizationId;

  if (!id) return undefined;

  return {
    company: id,
    ...(organizationId ? { organization_id: organizationId } : {}),
    ...(clerkOrgId ? { clerk_org_id: clerkOrgId } : {}),
  };
}
