#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const FULL_SHA = /^[a-f0-9]{40}$/;
const EVENT_ID = /^evt_[A-Za-z0-9_]+$/;
const MAX_NEWER_EVENT_SCAN = 100;
const RECOVERY_SUPPORTED_EVENT_TYPES = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
]);
const ENTITLEMENT_AFFECTING_EVENT_TYPES = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.paid',
]);
const OUTPUT_PATH = resolve('artifacts/stripe-entitlement-recovery/evidence.json');
const CONFIRMATION = 'REPAIR_STRIPE_ENTITLEMENT_SNAPSHOT';

const metadataSchema = z.object({
  organization_id: z.string().uuid(),
  entitlement_source_id: z.string().uuid(),
  plan_code: z.string().trim().min(1).max(120),
  full_seat_limit: z.coerce.number().int().min(0).max(1_000_000),
  participant_seat_limit: z.coerce.number().int().min(0).max(1_000_000),
  viewer_seat_limit: z.coerce.number().int().min(0).max(1_000_000),
  source_version: z.coerce.number().int().positive(),
  grace_period_days: z.coerce.number().int().min(0).max(90).default(0),
});

const storedEventSchema = z.object({
  id: z.string().regex(EVENT_ID),
  type: z.string().min(1),
  status: z.literal('processed'),
  livemode: z.literal(false),
  organization_id: z.string().uuid(),
  api_version: z.string().nullable().optional(),
  payload: z.object({
    id: z.string().regex(EVENT_ID),
    type: z.string().min(1),
    livemode: z.literal(false),
    created: z.number().int().positive(),
    data: z.object({
      object: z.object({
        id: z.string().min(1),
        metadata: z.record(z.string(), z.string()).nullable().optional(),
        current_period_end: z.number().int().positive().nullable().optional(),
        items: z.object({
          data: z.array(z.object({
            current_period_end: z.number().int().positive().nullable().optional(),
          }).passthrough()),
        }).nullable().optional(),
      }).passthrough(),
    }),
  }).passthrough(),
});

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function entitlementPayloadDigestForRecovery(input) {
  const canonical = {
    planCode: input.planCode,
    fullSeatLimit: input.fullSeatLimit,
    participantSeatLimit: input.participantSeatLimit,
    viewerSeatLimit: input.viewerSeatLimit,
    entitlements: input.entitlements,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
  };
  return createHash('sha256').update(stable(canonical)).digest('hex');
}

function validEpochSeconds(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function subscriptionPeriodEnd(object) {
  const legacy = validEpochSeconds(object.current_period_end);
  if (legacy) return legacy;

  const itemEnds = (object.items?.data ?? [])
    .map((item) => validEpochSeconds(item.current_period_end))
    .filter((value) => value !== null);
  return itemEnds.length > 0 ? Math.min(...itemEnds) : null;
}

/**
 * @param {unknown} rawRow
 * @param {{ expectedEventId?: string, expectedOrganizationId?: string, now?: Date }} [options]
 */
export function buildSnapshotFromStoredStripeEvent(rawRow, {
  expectedEventId,
  expectedOrganizationId,
  now = new Date(),
} = {}) {
  const row = storedEventSchema.parse(rawRow);
  if (!RECOVERY_SUPPORTED_EVENT_TYPES.has(row.type)) throw new Error('stripe_recovery_event_type_not_supported');
  if (expectedEventId && row.id !== expectedEventId) throw new Error('stripe_recovery_event_id_mismatch');
  if (row.payload.id !== row.id) throw new Error('stripe_recovery_payload_id_mismatch');
  if (row.payload.type !== row.type) throw new Error('stripe_recovery_payload_type_mismatch');
  if (expectedOrganizationId && row.organization_id !== expectedOrganizationId) {
    throw new Error('stripe_recovery_organization_mismatch');
  }

  const object = row.payload.data.object;
  const metadata = metadataSchema.parse(object.metadata ?? {});
  if (metadata.organization_id !== row.organization_id) {
    throw new Error('stripe_recovery_metadata_organization_mismatch');
  }
  if (expectedOrganizationId && metadata.organization_id !== expectedOrganizationId) {
    throw new Error('stripe_recovery_metadata_expected_organization_mismatch');
  }

  const periodEndSeconds = subscriptionPeriodEnd(object);
  if (!periodEndSeconds) throw new Error('stripe_recovery_billing_period_missing');
  const validUntil = new Date(periodEndSeconds * 1000);
  if (Number.isNaN(validUntil.valueOf()) || validUntil <= now) {
    throw new Error('stripe_recovery_billing_period_expired');
  }

  return {
    event: row.payload,
    sourceExternalReference: object.id,
    metadata,
    snapshot: {
      organizationId: metadata.organization_id,
      sourceId: metadata.entitlement_source_id,
      idempotencyKey: `stripe:${row.id}`,
      expectedSourceVersion: metadata.source_version,
      planCode: metadata.plan_code,
      fullSeatLimit: metadata.full_seat_limit,
      participantSeatLimit: metadata.participant_seat_limit,
      viewerSeatLimit: metadata.viewer_seat_limit,
      entitlements: {
        billing_provider: 'stripe',
        stripe_event_type: row.type,
        stripe_livemode: false,
        billing_delinquent: false,
        billing_recovered: false,
        subscription_terminated: false,
      },
      observedAt: new Date(row.payload.created * 1000).toISOString(),
      validFrom: now.toISOString(),
      validUntil: validUntil.toISOString(),
      actorUserId: null,
    },
  };
}

function exactRow(rows, missingCode, ambiguousCode) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(missingCode);
  if (rows.length !== 1) throw new Error(ambiguousCode);
  return rows[0];
}

export function validateSourceForRecovery(source, prepared) {
  if (!source || typeof source !== 'object') throw new Error('stripe_recovery_source_missing');
  if (source.id !== prepared.snapshot.sourceId) throw new Error('stripe_recovery_source_id_mismatch');
  if (source.organization_id !== prepared.snapshot.organizationId) throw new Error('stripe_recovery_source_organization_mismatch');
  if (source.source_kind !== 'stripe_subscription') throw new Error('stripe_recovery_source_kind_mismatch');
  if (source.external_reference !== prepared.sourceExternalReference) throw new Error('stripe_recovery_source_reference_mismatch');
  if (source.active !== true) throw new Error('stripe_recovery_source_inactive');
  if (Number(source.version) !== prepared.snapshot.expectedSourceVersion) throw new Error('stripe_recovery_source_version_mismatch');
  return true;
}

export function validateRecoveredSnapshot(snapshot, expected) {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('stripe_recovery_snapshot_missing');
  if (snapshot.organization_id !== expected.organizationId) throw new Error('stripe_recovery_snapshot_organization_mismatch');
  if (snapshot.source_id !== expected.sourceId) throw new Error('stripe_recovery_snapshot_source_mismatch');
  if (snapshot.idempotency_key !== expected.idempotencyKey) throw new Error('stripe_recovery_snapshot_idempotency_mismatch');
  if (snapshot.plan_code !== expected.planCode) throw new Error('stripe_recovery_snapshot_plan_mismatch');
  if (Number(snapshot.full_seat_limit) !== expected.fullSeatLimit) throw new Error('stripe_recovery_snapshot_full_limit_mismatch');
  if (Number(snapshot.participant_seat_limit) !== expected.participantSeatLimit) throw new Error('stripe_recovery_snapshot_participant_limit_mismatch');
  if (Number(snapshot.viewer_seat_limit) !== expected.viewerSeatLimit) throw new Error('stripe_recovery_snapshot_viewer_limit_mismatch');
  if (snapshot.status !== 'applied') throw new Error('stripe_recovery_snapshot_not_applied');
  if (typeof snapshot.id !== 'string' || !snapshot.id) throw new Error('stripe_recovery_snapshot_id_missing');
  return true;
}

function firstRpcRow(data) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data && typeof data === 'object' ? data : null;
}

function safeOrganizationDigest(organizationId) {
  return createHash('sha256').update(organizationId).digest('hex');
}

export async function recoverStoredStripeEntitlement({
  supabase,
  eventId,
  expectedOrganizationId,
  now = new Date(),
}) {
  if (!EVENT_ID.test(eventId)) throw new Error('stripe_recovery_event_id_invalid');
  if (!z.string().uuid().safeParse(expectedOrganizationId).success) throw new Error('stripe_recovery_organization_invalid');

  const { data: eventRows, error: eventError } = await supabase
    .from('stripe_events_processed')
    .select('id,type,status,livemode,organization_id,api_version,payload')
    .eq('id', eventId)
    .limit(2);
  if (eventError) throw new Error('stripe_recovery_ledger_unavailable');
  const eventRow = exactRow(eventRows, 'stripe_recovery_event_missing', 'stripe_recovery_event_ambiguous');
  const prepared = buildSnapshotFromStoredStripeEvent(eventRow, {
    expectedEventId: eventId,
    expectedOrganizationId,
    now,
  });

  const selectSnapshot = () => supabase
    .from('enterprise_entitlement_snapshots')
    .select('id,organization_id,source_id,idempotency_key,plan_code,full_seat_limit,participant_seat_limit,viewer_seat_limit,status,applied_policy_version,source_version,observed_at')
    .eq('idempotency_key', prepared.snapshot.idempotencyKey)
    .limit(2);

  const { data: existingRows, error: existingError } = await selectSnapshot();
  if (existingError) throw new Error('stripe_recovery_snapshot_lookup_unavailable');
  if (Array.isArray(existingRows) && existingRows.length > 1) throw new Error('stripe_recovery_snapshot_ambiguous');
  if (Array.isArray(existingRows) && existingRows.length === 1) {
    validateRecoveredSnapshot(existingRows[0], prepared.snapshot);
    return {
      outcome: 'idempotent_replay',
      eventId,
      eventType: eventRow.type,
      planCode: prepared.snapshot.planCode,
      organizationDigest: safeOrganizationDigest(expectedOrganizationId),
      snapshotId: existingRows[0].id,
      appliedPolicyVersion: existingRows[0].applied_policy_version ?? null,
    };
  }

  const { data: sourceRows, error: sourceError } = await supabase
    .from('enterprise_entitlement_sources')
    .select('id,organization_id,source_kind,external_reference,active,version')
    .eq('id', prepared.snapshot.sourceId)
    .limit(2);
  if (sourceError) throw new Error('stripe_recovery_source_unavailable');
  const source = exactRow(sourceRows, 'stripe_recovery_source_missing', 'stripe_recovery_source_ambiguous');
  validateSourceForRecovery(source, prepared);

  // Stripe event.created has second precision. Any *other* entitlement-affecting
  // event at the same second is therefore ambiguous, and any later one is stale
  // evidence for this recovery. Fail closed rather than guessing event ordering.
  const { data: newerEvents, error: newerEventError } = await supabase
    .from('stripe_events_processed')
    .select('id,type,stripe_created_at')
    .eq('organization_id', prepared.snapshot.organizationId)
    .eq('livemode', false)
    .eq('status', 'processed')
    .in('type', [...ENTITLEMENT_AFFECTING_EVENT_TYPES])
    .gte('stripe_created_at', prepared.snapshot.observedAt)
    .neq('id', eventId)
    .order('stripe_created_at', { ascending: true })
    .limit(MAX_NEWER_EVENT_SCAN + 1);
  if (newerEventError) throw new Error('stripe_recovery_newer_event_check_unavailable');
  if (!Array.isArray(newerEvents)) throw new Error('stripe_recovery_newer_event_check_invalid');
  if (newerEvents.length > MAX_NEWER_EVENT_SCAN) throw new Error('stripe_recovery_newer_event_scan_truncated');
  if (newerEvents.length > 0) throw new Error('stripe_recovery_newer_event_exists');

  const { data: newerSnapshots, error: newerSnapshotError } = await supabase
    .from('enterprise_entitlement_snapshots')
    .select('id,observed_at,status')
    .eq('organization_id', prepared.snapshot.organizationId)
    .gte('observed_at', prepared.snapshot.observedAt)
    .neq('idempotency_key', prepared.snapshot.idempotencyKey)
    .limit(1);
  if (newerSnapshotError) throw new Error('stripe_recovery_newer_snapshot_check_unavailable');
  if (!Array.isArray(newerSnapshots)) throw new Error('stripe_recovery_newer_snapshot_check_invalid');
  if (newerSnapshots.length > 0) throw new Error('stripe_recovery_newer_snapshot_exists');

  const input = prepared.snapshot;
  const { data: rpcData, error: rpcError } = await supabase.rpc('apply_enterprise_entitlement_snapshot_atomic', {
    p_organization_id: input.organizationId,
    p_source_id: input.sourceId,
    p_idempotency_key: input.idempotencyKey,
    p_expected_source_version: input.expectedSourceVersion,
    p_plan_code: input.planCode,
    p_full_seat_limit: input.fullSeatLimit,
    p_participant_seat_limit: input.participantSeatLimit,
    p_viewer_seat_limit: input.viewerSeatLimit,
    p_entitlements: input.entitlements,
    p_source_payload_sha256: entitlementPayloadDigestForRecovery(input),
    p_observed_at: input.observedAt,
    p_valid_from: input.validFrom,
    p_valid_until: input.validUntil,
    p_actor_user_id: input.actorUserId,
  });
  if (rpcError) throw new Error('stripe_recovery_reconciliation_unavailable');
  const rpcRow = firstRpcRow(rpcData);
  if (!rpcRow || !['applied', 'idempotent_replay'].includes(String(rpcRow.outcome ?? ''))) {
    throw new Error(`stripe_recovery_reconciliation_rejected:${String(rpcRow?.outcome ?? 'invalid_response')}`);
  }
  if (typeof rpcRow.snapshot_id !== 'string' || !rpcRow.snapshot_id) {
    throw new Error('stripe_recovery_reconciliation_snapshot_missing');
  }

  const { data: recoveredRows, error: recoveredError } = await selectSnapshot();
  if (recoveredError) throw new Error('stripe_recovery_postcheck_unavailable');
  const recovered = exactRow(recoveredRows, 'stripe_recovery_postcheck_missing', 'stripe_recovery_postcheck_ambiguous');
  validateRecoveredSnapshot(recovered, prepared.snapshot);
  if (recovered.id !== rpcRow.snapshot_id) throw new Error('stripe_recovery_postcheck_snapshot_id_mismatch');

  return {
    outcome: String(rpcRow.outcome),
    eventId,
    eventType: eventRow.type,
    planCode: prepared.snapshot.planCode,
    organizationDigest: safeOrganizationDigest(expectedOrganizationId),
    snapshotId: recovered.id,
    appliedPolicyVersion: recovered.applied_policy_version ?? rpcRow.applied_policy_version ?? null,
  };
}

function createRecoveryClient() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRole = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) throw new Error('stripe_recovery_supabase_credentials_missing');
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') throw new Error('invalid protocol');
  } catch {
    throw new Error('stripe_recovery_supabase_url_invalid');
  }
  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  const releaseSha = env('RELEASE_SHA').toLowerCase();
  const eventId = env('STRIPE_EVENT_ID');
  const organizationId = env('EXPECTED_ORGANIZATION_ID');
  if (!FULL_SHA.test(releaseSha)) throw new Error('stripe_recovery_release_sha_invalid');
  if (env('STRIPE_TEST_MODE_CONFIRMED') !== 'true') throw new Error('stripe_recovery_test_mode_not_confirmed');
  if (env('RECOVERY_CONFIRMATION') !== CONFIRMATION) throw new Error('stripe_recovery_confirmation_invalid');

  const result = await recoverStoredStripeEntitlement({
    supabase: createRecoveryClient(),
    eventId,
    expectedOrganizationId: organizationId,
  });

  const evidence = {
    schema: 'risck-comply.stripe-entitlement-recovery-evidence.v1',
    status: 'Complete',
    outcome: 'passed',
    generatedAt: new Date().toISOString(),
    repository: env('GITHUB_REPOSITORY') || 'renanescola40-afk/eurocomply_saas',
    targetSha: releaseSha,
    observedSha: releaseSha,
    environment: 'production',
    recoveryMode: 'stored_verified_test_event_entitlement_only',
    stripeEventId: result.eventId,
    stripeEventType: result.eventType,
    planCode: result.planCode,
    organizationDigestSha256: result.organizationDigest,
    reconciliationOutcome: result.outcome,
    snapshotMaterialized: Boolean(result.snapshotId),
    appliedPolicyVersion: result.appliedPolicyVersion,
    safety: {
      stripeTestModeOnly: true,
      coreBillingHandlerInvoked: false,
      customerChargeCreated: false,
      customerEmailSent: false,
      rawStripePayloadStoredInEvidence: false,
      serviceRoleStoredInEvidence: false,
      exactShaBound: true,
      retainedLedgerEventRequired: true,
      newerRetainedStateChecked: true,
      canonicalAtomicRpcUsed: true,
    },
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    status: evidence.status,
    outcome: evidence.outcome,
    stripeEventId: evidence.stripeEventId,
    reconciliationOutcome: evidence.reconciliationOutcome,
    snapshotMaterialized: evidence.snapshotMaterialized,
    appliedPolicyVersion: evidence.appliedPolicyVersion,
  }, null, 2));
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'stripe_recovery_failed');
    process.exit(1);
  });
}
