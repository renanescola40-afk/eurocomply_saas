#!/usr/bin/env node

import crypto from 'node:crypto';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function insertOne(admin, table, row, label) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error || !data?.id) {
    throw new Error(`${label}_create_failed:${error?.message ?? 'missing_id'}`);
  }
  return data;
}

export async function grantBoundedV20CommercialAuthority(admin, organizationId, label = 'live-proof') {
  assert(organizationId, 'organization_id_required_for_v20_commercial_authority');
  const observedAt = new Date();
  const validFrom = new Date(observedAt.getTime() - 60_000).toISOString();
  const validUntil = new Date(observedAt.getTime() + 60 * 60_000).toISOString();
  const externalReference = `v20-live-proof-${label}-${crypto.randomUUID()}`;

  const source = await insertOne(admin, 'enterprise_entitlement_sources', {
    organization_id: organizationId,
    source_kind: 'signed_contract',
    external_reference: externalReference,
    priority: 1000,
    active: true,
    version: 1,
    effective_from: validFrom,
    effective_until: validUntil,
  }, `${label}_commercial_source`);

  const payloadSha256 = crypto
    .createHash('sha256')
    .update(`${organizationId}:${source.id}:${externalReference}`)
    .digest('hex');

  const snapshot = await insertOne(admin, 'enterprise_entitlement_snapshots', {
    organization_id: organizationId,
    source_id: source.id,
    idempotency_key: `v20-live-proof-${crypto.randomUUID()}`,
    source_version: 1,
    plan_code: 'starter',
    full_seat_limit: 10,
    participant_seat_limit: 10,
    viewer_seat_limit: 10,
    entitlements: { runtime_proof: true },
    source_payload_sha256: payloadSha256,
    observed_at: observedAt.toISOString(),
    valid_from: validFrom,
    valid_until: validUntil,
    status: 'applied',
    applied_policy_version: 1,
  }, `${label}_commercial_snapshot`);

  return {
    sourceId: source.id,
    snapshotId: snapshot.id,
    validUntil,
    sourceKind: 'signed_contract',
    syntheticStripeLifecycle: false,
  };
}

async function deleteByOrganization(admin, table, organizationIds, failures) {
  if (organizationIds.length === 0) return;
  const { error } = await admin.from(table).delete().in('organization_id', organizationIds);
  if (error) failures.push(`${table}:${String(error.message).slice(0, 180)}`);
}

async function deleteRows(admin, rows, failures) {
  for (const [table, id] of [...rows].reverse()) {
    if (!id || table === 'organizations' || table === 'organization_members') continue;
    const { error } = await admin.from(table).delete().eq('id', id);
    if (error) failures.push(`${table}:${String(error.message).slice(0, 180)}`);
  }
}

export async function cleanupV20SyntheticFixture(admin, {
  rows = [],
  users = [],
  organizations = [],
} = {}) {
  const failures = [];
  const organizationIds = [...new Set(organizations.filter(Boolean))];

  await deleteRows(admin, rows, failures);

  // Remove memberships before the compatibility contract. The membership DELETE
  // trigger may refresh organization_usage; that row is removed below and also
  // cascades with the final organization deletion.
  await deleteByOrganization(admin, 'organization_members', organizationIds, failures);

  // Payment-first proof authority and the automatic Enterprise compatibility
  // envelope must be removed in FK-safe order. No Stripe/provider lifecycle is
  // synthesized by this fixture helper.
  for (const table of [
    'enterprise_entitlement_reconciliation_events',
    'enterprise_entitlement_snapshots',
    'enterprise_entitlement_sources',
    'organization_entitlements',
    'organization_usage',
    'enterprise_seat_operations',
    'enterprise_seat_policies',
    'enterprise_contracts',
  ]) {
    await deleteByOrganization(admin, table, organizationIds, failures);
  }

  for (const organizationId of [...organizationIds].reverse()) {
    const { error } = await admin.from('organizations').delete().eq('id', organizationId);
    if (error) failures.push(`organizations:${String(error.message).slice(0, 180)}`);
  }

  for (const userId of [...new Set(users.filter(Boolean))].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) failures.push(`auth.users:${String(error.message).slice(0, 180)}`);
  }

  if (failures.length > 0) {
    throw new Error(`v20_fixture_cleanup_failed:${failures.join('|')}`);
  }

  return {
    cleanupPassed: true,
    providerEventsCreated: false,
    stripeLifecycleSynthesized: false,
    organizationsRemoved: organizationIds.length,
    usersRemoved: new Set(users.filter(Boolean)).size,
  };
}
