import { createAdminClient } from '@/lib/supabase/admin';
import type { BillingAddOnSelection } from './add-ons';

export const BILLING_LIFECYCLE_LEASE_MS = 2 * 60 * 1000;
export const BILLING_LIFECYCLE_PHASE_PROVIDER_IN_FLIGHT = 'provider_in_flight';
export const BILLING_LIFECYCLE_PHASE_PROVIDER_SUCCEEDED = 'provider_succeeded_pending_audit';
export const BILLING_LIFECYCLE_PHASE_AUDIT_SUCCEEDED = 'audit_succeeded_pending_completion';

export type BillingLifecycleAction = 'upgrade' | 'downgrade' | 'cancel' | 'reactivate' | 'replace_add_ons';

export type BillingLifecycleRequestRow = {
  id: string;
  organization_id: string;
  requested_by: string;
  action: BillingLifecycleAction;
  source_plan: string | null;
  target_plan: string | null;
  billing_interval: string | null;
  add_ons: unknown;
  stripe_subscription_id: string | null;
  stripe_request_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  failure_code: string | null;
  requested_at: string;
  completed_at: string | null;
  updated_at: string;
};

export class BillingLifecycleRequestError extends Error {
  constructor(
    public readonly code:
      | 'billing_request_in_progress'
      | 'billing_idempotency_conflict'
      | 'billing_provider_outcome_uncertain',
    public readonly status: 409,
  ) {
    super(code);
    this.name = 'BillingLifecycleRequestError';
  }
}

type ClaimInput = {
  organizationId: string;
  requestedBy: string;
  action: BillingLifecycleAction;
  sourcePlan: string;
  targetPlan: string;
  billingInterval: 'month' | 'year';
  addOns: BillingAddOnSelection[];
  stripeSubscriptionId: string;
  requestDigest: string;
  now?: Date;
};

export type BillingLifecycleRequestClaim =
  | { kind: 'claimed'; request: BillingLifecycleRequestRow }
  | { kind: 'completed_replay'; request: BillingLifecycleRequestRow }
  | { kind: 'provider_succeeded_recovery'; request: BillingLifecycleRequestRow }
  | { kind: 'audit_succeeded_recovery'; request: BillingLifecycleRequestRow };

type ActiveLeaseRow = Pick<BillingLifecycleRequestRow, 'id' | 'status' | 'failure_code' | 'updated_at'>;

function canonicalizeAddOns(value: unknown) {
  if (!Array.isArray(value)) return [] as Array<{ slug: string; quantity: number }>;

  return value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const record = item as { slug?: unknown; quantity?: unknown };
      const slug = typeof record.slug === 'string' ? record.slug.trim() : '';
      const quantity = typeof record.quantity === 'number' && Number.isInteger(record.quantity) ? record.quantity : 0;
      return slug && quantity > 0 ? { slug, quantity } : null;
    })
    .filter((item): item is { slug: string; quantity: number } => Boolean(item))
    .sort((left, right) => left.slug.localeCompare(right.slug));
}

function requestMatches(row: BillingLifecycleRequestRow, input: ClaimInput) {
  return (
    row.organization_id === input.organizationId &&
    row.requested_by === input.requestedBy &&
    row.action === input.action &&
    (row.target_plan ?? '') === input.targetPlan &&
    (row.billing_interval ?? '') === input.billingInterval &&
    (row.stripe_subscription_id ?? '') === input.stripeSubscriptionId &&
    JSON.stringify(canonicalizeAddOns(row.add_ons)) === JSON.stringify(canonicalizeAddOns(input.addOns))
  );
}

export function isBillingLifecycleLeaseStale(updatedAt: string | null | undefined, nowMs = Date.now()) {
  const timestamp = Date.parse(updatedAt ?? '');
  return !Number.isFinite(timestamp) || nowMs - timestamp >= BILLING_LIFECYCLE_LEASE_MS;
}

export function canExpireBillingLifecycleLease(row: ActiveLeaseRow, nowMs = Date.now()) {
  return (
    (row.status === 'pending' || row.status === 'processing') &&
    row.failure_code === null &&
    isBillingLifecycleLeaseStale(row.updated_at, nowMs)
  );
}

function storageFailure(area: string, error?: { code?: string } | null): never {
  console.warn('[billing-lifecycle-ledger] storage_failure', {
    area,
    code: error?.code ?? 'unknown',
  });
  throw new Error('billing_lifecycle_ledger_unavailable');
}

async function findByDigest(organizationId: string, requestDigest: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('billing_lifecycle_requests')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('stripe_request_id', requestDigest)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) storageFailure('lookup', error);
  return (data ?? null) as BillingLifecycleRequestRow | null;
}

async function recoverLegacyPostProviderFailure(row: BillingLifecycleRequestRow) {
  const now = new Date().toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('billing_lifecycle_requests')
    .update({
      status: 'processing',
      failure_code: BILLING_LIFECYCLE_PHASE_PROVIDER_SUCCEEDED,
      completed_at: null,
      updated_at: now,
    })
    .eq('id', row.id)
    .eq('status', 'failed')
    .eq('failure_code', 'audit_persistence_failed')
    .select('*')
    .maybeSingle();

  if (error) storageFailure('legacy_post_provider_recovery', error);
  return (data ?? null) as BillingLifecycleRequestRow | null;
}

async function reclaimExisting(row: BillingLifecycleRequestRow, input: ClaimInput): Promise<BillingLifecycleRequestClaim> {
  if (!requestMatches(row, input)) {
    throw new BillingLifecycleRequestError('billing_idempotency_conflict', 409);
  }

  if (row.status === 'completed') {
    return { kind: 'completed_replay', request: row };
  }

  if (row.status === 'failed' && row.failure_code === 'audit_persistence_failed') {
    const recovered = await recoverLegacyPostProviderFailure(row);
    if (!recovered) throw new BillingLifecycleRequestError('billing_request_in_progress', 409);
    return { kind: 'provider_succeeded_recovery', request: recovered };
  }

  if (row.status === 'processing' && row.failure_code === BILLING_LIFECYCLE_PHASE_AUDIT_SUCCEEDED) {
    return { kind: 'audit_succeeded_recovery', request: row };
  }

  if (row.status === 'processing' && row.failure_code === BILLING_LIFECYCLE_PHASE_PROVIDER_SUCCEEDED) {
    return { kind: 'provider_succeeded_recovery', request: row };
  }

  const now = input.now ?? new Date();

  if (row.status === 'processing' && row.failure_code === BILLING_LIFECYCLE_PHASE_PROVIDER_IN_FLIGHT) {
    if (isBillingLifecycleLeaseStale(row.updated_at, now.getTime())) {
      throw new BillingLifecycleRequestError('billing_provider_outcome_uncertain', 409);
    }
    throw new BillingLifecycleRequestError('billing_request_in_progress', 409);
  }

  if ((row.status === 'pending' || row.status === 'processing') && row.failure_code) {
    throw new BillingLifecycleRequestError('billing_provider_outcome_uncertain', 409);
  }

  if ((row.status === 'pending' || row.status === 'processing') && !isBillingLifecycleLeaseStale(row.updated_at, now.getTime())) {
    throw new BillingLifecycleRequestError('billing_request_in_progress', 409);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('billing_lifecycle_requests')
    .update({
      status: 'processing',
      failure_code: null,
      completed_at: null,
      updated_at: now.toISOString(),
    })
    .eq('id', row.id)
    .eq('status', row.status)
    .select('*')
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      throw new BillingLifecycleRequestError('billing_request_in_progress', 409);
    }
    storageFailure('reclaim', error);
  }

  if (!data) {
    throw new BillingLifecycleRequestError('billing_request_in_progress', 409);
  }

  return { kind: 'claimed', request: data as BillingLifecycleRequestRow };
}

async function expireStaleOrganizationLease(organizationId: string, now: Date) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('billing_lifecycle_requests')
    .select('id,status,failure_code,updated_at')
    .eq('organization_id', organizationId)
    .in('status', ['pending', 'processing'])
    .order('updated_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) storageFailure('active_lease_lookup', error);
  const active = (data ?? null) as ActiveLeaseRow | null;
  if (!active || !canExpireBillingLifecycleLease(active, now.getTime())) return false;

  const { data: expired, error: expireError } = await supabase
    .from('billing_lifecycle_requests')
    .update({
      status: 'failed',
      failure_code: 'processing_lease_expired',
      updated_at: now.toISOString(),
    })
    .eq('id', active.id)
    .eq('status', active.status)
    .eq('updated_at', active.updated_at)
    .select('id')
    .maybeSingle();

  if (expireError) storageFailure('active_lease_expire', expireError);
  return Boolean(expired);
}

async function insertBillingLifecycleRequest(input: ClaimInput, now: Date) {
  const supabase = createAdminClient();
  return supabase
    .from('billing_lifecycle_requests')
    .insert({
      organization_id: input.organizationId,
      requested_by: input.requestedBy,
      action: input.action,
      source_plan: input.sourcePlan,
      target_plan: input.targetPlan,
      billing_interval: input.billingInterval,
      add_ons: canonicalizeAddOns(input.addOns),
      stripe_subscription_id: input.stripeSubscriptionId,
      stripe_request_id: input.requestDigest,
      status: 'processing',
      failure_code: null,
      requested_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .select('*')
    .single();
}

export async function claimBillingLifecycleRequest(input: ClaimInput): Promise<BillingLifecycleRequestClaim> {
  const existing = await findByDigest(input.organizationId, input.requestDigest);
  if (existing) return reclaimExisting(existing, input);

  const now = input.now ?? new Date();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await insertBillingLifecycleRequest(input, now);

    if (!error) {
      return { kind: 'claimed', request: data as BillingLifecycleRequestRow };
    }

    if (error.code !== '23505') storageFailure('claim', error);

    const raced = await findByDigest(input.organizationId, input.requestDigest);
    if (raced) return reclaimExisting(raced, input);

    if (attempt === 0 && (await expireStaleOrganizationLease(input.organizationId, now))) {
      continue;
    }

    throw new BillingLifecycleRequestError('billing_request_in_progress', 409);
  }

  throw new BillingLifecycleRequestError('billing_request_in_progress', 409);
}

export async function markBillingLifecycleProviderInFlight(requestId: string) {
  const updatedAt = new Date().toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('billing_lifecycle_requests')
    .update({
      failure_code: BILLING_LIFECYCLE_PHASE_PROVIDER_IN_FLIGHT,
      updated_at: updatedAt,
    })
    .eq('id', requestId)
    .eq('status', 'processing')
    .is('failure_code', null)
    .select('id')
    .maybeSingle();

  if (error || !data) storageFailure('provider_in_flight', error);
}

export async function markBillingLifecycleProviderSucceeded(requestId: string) {
  const updatedAt = new Date().toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('billing_lifecycle_requests')
    .update({
      failure_code: BILLING_LIFECYCLE_PHASE_PROVIDER_SUCCEEDED,
      updated_at: updatedAt,
    })
    .eq('id', requestId)
    .eq('status', 'processing')
    .eq('failure_code', BILLING_LIFECYCLE_PHASE_PROVIDER_IN_FLIGHT)
    .select('id')
    .maybeSingle();

  if (error || !data) storageFailure('provider_succeeded', error);
}

export async function markBillingLifecycleAuditSucceeded(requestId: string) {
  const updatedAt = new Date().toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('billing_lifecycle_requests')
    .update({
      failure_code: BILLING_LIFECYCLE_PHASE_AUDIT_SUCCEEDED,
      updated_at: updatedAt,
    })
    .eq('id', requestId)
    .eq('status', 'processing')
    .eq('failure_code', BILLING_LIFECYCLE_PHASE_PROVIDER_SUCCEEDED)
    .select('id')
    .maybeSingle();

  if (error || !data) storageFailure('audit_succeeded', error);
}

export async function completeBillingLifecycleRequest(requestId: string) {
  const completedAt = new Date().toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('billing_lifecycle_requests')
    .update({
      status: 'completed',
      failure_code: null,
      completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq('id', requestId)
    .eq('status', 'processing')
    .select('id')
    .maybeSingle();

  if (error || !data) storageFailure('complete', error);
}

export async function failBillingLifecycleRequest(requestId: string, failureCode: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('billing_lifecycle_requests')
      .update({
        status: 'failed',
        failure_code: failureCode.slice(0, 96),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('status', 'processing');

    if (error) {
      console.warn('[billing-lifecycle-ledger] failure_record_unavailable', {
        code: error.code ?? 'unknown',
      });
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
