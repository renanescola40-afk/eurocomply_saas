import { createAdminClient } from '@/lib/supabase/admin';

const LIVE_STRIPE_SUBSCRIPTION_EVENT_TYPES = [
  'customer.subscription.created',
  'customer.subscription.updated',
] as const;

const BILLING_AUTHORITY_UNAVAILABLE = 'billing_authority_unavailable';

type StripeSubscriptionAuthorityInput = {
  organizationId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
};

type StripeEventAuthorityRow = {
  id: string;
  payload: {
    data?: {
      object?: {
        id?: string | null;
        customer?: string | { id?: string | null } | null;
      } | null;
    } | null;
  } | null;
};

type SignedContractSource = {
  id: string;
  priority: number;
  effective_from: string;
  effective_until: string | null;
};

type AppliedContractSnapshot = {
  plan_code: string;
  valid_from: string;
  valid_until: string | null;
};

function reportAuthorityLookupFailure(area: string, code?: string) {
  console.warn('[billing] authority_lookup_failed', {
    area,
    code: code ?? 'unknown',
  });
}

function stripeObjectCustomerId(value: StripeEventAuthorityRow['payload']) {
  const customer = value?.data?.object?.customer;
  if (typeof customer === 'string') return customer;
  return customer?.id ?? null;
}

/**
 * A persisted subscriptions row is not enough to grant paid access. Production
 * has historically contained seeded rows and test-mode Stripe identifiers.
 * Require a processed live Stripe subscription event correlated to the exact
 * organization + subscription + customer before treating the row as commercial
 * authority.
 */
export async function hasProcessedLiveStripeSubscriptionAuthority({
  organizationId,
  stripeCustomerId,
  stripeSubscriptionId,
}: StripeSubscriptionAuthorityInput) {
  if (!stripeCustomerId || !stripeSubscriptionId) return false;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('stripe_events_processed')
    .select('id,payload')
    .eq('organization_id', organizationId)
    .eq('livemode', true)
    .eq('status', 'processed')
    .in('type', [...LIVE_STRIPE_SUBSCRIPTION_EVENT_TYPES])
    .order('stripe_created_at', { ascending: false })
    .limit(50);

  if (error) {
    reportAuthorityLookupFailure('stripe_live_event', error.code);
    throw new Error(BILLING_AUTHORITY_UNAVAILABLE);
  }

  return ((data ?? []) as StripeEventAuthorityRow[]).some((row) => (
    row.payload?.data?.object?.id === stripeSubscriptionId
    && stripeObjectCustomerId(row.payload) === stripeCustomerId
  ));
}

/**
 * Negotiated Enterprise access is independent from ordinary Stripe lifecycle
 * state. Only an active signed-contract source with an applied, currently-valid
 * entitlement snapshot may override the self-serve plan authority.
 */
export async function getAuthoritativeSignedContractPlan(organizationId: string) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: source, error: sourceError } = await supabase
    .from('enterprise_entitlement_sources')
    .select('id,priority,effective_from,effective_until')
    .eq('organization_id', organizationId)
    .eq('source_kind', 'signed_contract')
    .eq('active', true)
    .lte('effective_from', now)
    .or(`effective_until.is.null,effective_until.gt.${now}`)
    .order('priority', { ascending: false })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle<SignedContractSource>();

  if (sourceError) {
    reportAuthorityLookupFailure('signed_contract_source', sourceError.code);
    throw new Error(BILLING_AUTHORITY_UNAVAILABLE);
  }

  if (!source?.id) return null;

  const { data: snapshot, error: snapshotError } = await supabase
    .from('enterprise_entitlement_snapshots')
    .select('plan_code,valid_from,valid_until')
    .eq('organization_id', organizationId)
    .eq('source_id', source.id)
    .eq('status', 'applied')
    .lte('valid_from', now)
    .or(`valid_until.is.null,valid_until.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<AppliedContractSnapshot>();

  if (snapshotError) {
    reportAuthorityLookupFailure('signed_contract_snapshot', snapshotError.code);
    throw new Error(BILLING_AUTHORITY_UNAVAILABLE);
  }

  const planCode = snapshot?.plan_code?.trim().toLowerCase();
  return planCode || null;
}

export const billingAuthorityContract = {
  liveStripeEventTypes: LIVE_STRIPE_SUBSCRIPTION_EVENT_TYPES,
  unavailableError: BILLING_AUTHORITY_UNAVAILABLE,
} as const;
