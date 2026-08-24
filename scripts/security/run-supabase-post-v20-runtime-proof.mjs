#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const outputPath = process.env.POST_V20_RUNTIME_OUTPUT
  || 'artifacts/supabase-post-v20-runtime-proof/supabase-post-v20-runtime-validation.json';

const requiredCommercialTables = [
  'ai_systems',
  'documents',
  'risks',
  'vendors',
  'tasks',
  'compliance_tasks',
  'evidence_items',
  'onboarding_activation_runs',
  'monitoring_preferences',
  'audit_logs',
  'invitations',
];

const optionalCommercialTables = [
  'ai_assessments',
  'ai_incidents',
  'notifications',
  'audit_events',
];

const now = () => new Date().toISOString();

function requireEnv(name) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function safeError(error) {
  if (!error) return null;
  return {
    code: String(error.code ?? 'unknown').slice(0, 40),
    message: String(error.message ?? 'error').slice(0, 220),
  };
}

function projectReference(url) {
  return String(url).match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i)?.[1] ?? null;
}

function redactedProjectReference(url) {
  const ref = projectReference(url);
  if (!ref) return 'redacted:unknown';
  return `redacted:sha256:${crypto.createHash('sha256').update(ref).digest('hex').slice(0, 16)}`;
}

function supabaseClient(url, key) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function writeEvidence(payload) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function insertOne(client, table, row, label) {
  const { data, error } = await client.from(table).insert(row).select('*').single();
  if (error || !data?.id) throw new Error(`${label}_create_failed:${error?.message ?? 'missing_id'}`);
  return data;
}

async function createUser(admin, label, suffix, created) {
  const email = `post-v20-${label}-${suffix}@example.com`;
  const password = `Rc!${crypto.randomBytes(24).toString('base64url')}9a`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { purpose: 'post-v20-runtime-proof', label },
  });
  if (error || !data.user?.id) throw new Error(`${label}_user_create_failed:${error?.message ?? 'missing_id'}`);
  created.users.push(data.user.id);
  return { id: data.user.id, email, password };
}

async function signIn(url, anonKey, identity, label) {
  const client = supabaseClient(url, anonKey);
  const { data, error } = await client.auth.signInWithPassword({
    email: identity.email,
    password: identity.password,
  });
  if (error || !data.session) throw new Error(`${label}_sign_in_failed:${error?.message ?? 'missing_session'}`);
  return client;
}

async function grantBoundedCommercialAuthority(admin, organizationId, label, suffix) {
  const observedAt = new Date();
  const validFrom = new Date(observedAt.getTime() - 60_000).toISOString();
  const validUntil = new Date(observedAt.getTime() + 60 * 60_000).toISOString();
  const externalReference = `post-v20-runtime-proof-${label}-${suffix}`;
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

  await insertOne(admin, 'enterprise_entitlement_snapshots', {
    organization_id: organizationId,
    source_id: source.id,
    idempotency_key: `post-v20-${label}-${crypto.randomUUID()}`,
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
}

async function expectSingleRow(operation, label) {
  const { data, error } = await operation();
  if (error || !Array.isArray(data) || data.length !== 1) {
    throw new Error(`${label}_expected_single_row:${error?.message ?? 'unexpected_row_count'}`);
  }
  return data[0];
}

async function expectNoVisibleRows(operation, label) {
  const { data, error } = await operation();
  if (error) return { mode: 'denied', error: safeError(error) };
  if (Array.isArray(data) && data.length === 0) return { mode: 'filtered', error: null };
  throw new Error(`${label}_unexpectedly_visible`);
}

async function expectExplicitDenial(operation, label) {
  const result = await operation();
  if (!result?.error) throw new Error(`${label}_unexpectedly_succeeded`);
  return { mode: 'denied', error: safeError(result.error) };
}

async function verifyRowUnchanged(admin, table, id, field, expected, label) {
  const { data, error } = await admin.from(table).select(`id,${field}`).eq('id', id).single();
  if (error || data?.[field] !== expected) throw new Error(`${label}_row_changed_or_missing`);
}

async function deleteByIds(admin, table, ids, failures) {
  if (ids.length === 0) return;
  const { error } = await admin.from(table).delete().in('id', ids);
  if (error) failures.push(`${table}:${String(error.message).slice(0, 160)}`);
}

async function deleteByOrganizations(admin, table, organizationIds, failures) {
  if (organizationIds.length === 0) return;
  const { error } = await admin.from(table).delete().in('organization_id', organizationIds);
  if (error) failures.push(`${table}:${String(error.message).slice(0, 160)}`);
}

async function cleanup(admin, created) {
  const failures = [];
  const byTable = new Map();
  for (const [table, id] of created.rows) {
    const ids = byTable.get(table) ?? [];
    ids.push(id);
    byTable.set(table, ids);
  }

  for (const [table, ids] of [...byTable.entries()].reverse()) {
    await deleteByIds(admin, table, ids, failures);
  }

  const organizationIds = [...created.organizations].reverse();
  for (const table of [
    'enterprise_entitlement_reconciliation_events',
    'enterprise_entitlement_snapshots',
    'enterprise_entitlement_sources',
    'organization_entitlements',
    'organization_usage',
    'enterprise_contracts',
    'organization_members',
  ]) {
    await deleteByOrganizations(admin, table, organizationIds, failures);
  }

  for (const organizationId of organizationIds) {
    const { error } = await admin.from('organizations').delete().eq('id', organizationId);
    if (error) failures.push(`organizations:${String(error.message).slice(0, 160)}`);
  }

  for (const userId of [...created.users].reverse()) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) failures.push(`auth.users:${String(error.message).slice(0, 160)}`);
  }

  if (failures.length > 0) throw new Error(`fixture_cleanup_failed:${failures.join('|')}`);
}

async function setup(admin, suffix, created) {
  const actorA = await createUser(admin, 'tenant-a', suffix, created);
  const actorB = await createUser(admin, 'tenant-b', suffix, created);
  const actorU = await createUser(admin, 'tenant-unlicensed', suffix, created);

  const orgA = await insertOne(admin, 'organizations', {
    name: `Post V20 Tenant A ${suffix}`,
    slug: `post-v20-a-${suffix}`,
    created_by: actorA.id,
  }, 'organization_a');
  const orgB = await insertOne(admin, 'organizations', {
    name: `Post V20 Tenant B ${suffix}`,
    slug: `post-v20-b-${suffix}`,
    created_by: actorB.id,
  }, 'organization_b');
  const orgU = await insertOne(admin, 'organizations', {
    name: `Post V20 Unlicensed ${suffix}`,
    slug: `post-v20-u-${suffix}`,
    created_by: actorU.id,
  }, 'organization_unlicensed');
  created.organizations.push(orgA.id, orgB.id, orgU.id);

  for (const [organizationId, userId, label] of [
    [orgA.id, actorA.id, 'membership_a'],
    [orgB.id, actorB.id, 'membership_b'],
    [orgU.id, actorU.id, 'membership_unlicensed'],
  ]) {
    await insertOne(admin, 'organization_members', {
      organization_id: organizationId,
      user_id: userId,
      role: 'owner',
      seat_type: 'full',
      status: 'active',
    }, label);
  }

  await grantBoundedCommercialAuthority(admin, orgA.id, 'tenant-a', suffix);
  await grantBoundedCommercialAuthority(admin, orgB.id, 'tenant-b', suffix);

  const aiA = await insertOne(admin, 'ai_systems', {
    organization_id: orgA.id,
    name: `Post V20 AI A ${suffix}`,
    use_case: 'post-v20 runtime proof',
    created_by: actorA.id,
  }, 'ai_a');
  const aiB = await insertOne(admin, 'ai_systems', {
    organization_id: orgB.id,
    name: `Post V20 AI B ${suffix}`,
    use_case: 'post-v20 runtime proof',
    created_by: actorB.id,
  }, 'ai_b');
  const aiU = await insertOne(admin, 'ai_systems', {
    organization_id: orgU.id,
    name: `Post V20 AI U ${suffix}`,
    use_case: 'post-v20 runtime proof',
    created_by: actorU.id,
  }, 'ai_unlicensed');
  created.rows.push(['ai_systems', aiA.id], ['ai_systems', aiB.id], ['ai_systems', aiU.id]);

  const regulatory = await insertOne(admin, 'regulatory_updates', {
    title: `Post V20 backend-only reference ${suffix}`,
    summary: 'Synthetic runtime proof row',
    severity: 'low',
    source_url: `https://example.com/post-v20/${suffix}`,
    published_at: now(),
  }, 'regulatory_update');
  created.rows.push(['regulatory_updates', regulatory.id]);

  return { actorA, actorB, actorU, orgA, orgB, orgU, aiA, aiB, aiU, regulatory };
}

async function runProof() {
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('github_actions_required');

  const targetSha = requireEnv('TARGET_SHA').toLowerCase();
  const githubSha = requireEnv('GITHUB_SHA').toLowerCase();
  const promotionRunId = requireEnv('PROMOTION_RUN_ID');
  assert(/^[a-f0-9]{40}$/.test(targetSha), 'invalid_target_sha');
  assert(targetSha === githubSha, 'github_sha_mismatch');
  assert(/^\d+$/.test(promotionRunId), 'invalid_promotion_run_id');

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  assert(Boolean(projectReference(url)), 'live_supabase_project_url_required');

  const admin = supabaseClient(url, serviceRoleKey);
  const anon = supabaseClient(url, anonKey);
  const created = { users: [], organizations: [], rows: [] };
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const checks = {};
  let proofError = null;
  let cleanupError = null;

  try {
    const inventoryTargets = [...requiredCommercialTables, ...optionalCommercialTables];
    const { data: inventory, error: inventoryError } = await admin.rpc('eurocomply_live_rls_inventory', {
      table_names: inventoryTargets,
    });
    if (inventoryError || !Array.isArray(inventory)) {
      throw new Error(`service_role_inventory_failed:${inventoryError?.message ?? 'missing_inventory'}`);
    }

    const requiredInventory = requiredCommercialTables.map((table) => {
      const row = inventory.find((entry) => entry?.table_name === table);
      return {
        table,
        exists: row?.exists === true,
        rlsEnabled: row?.rls_enabled === true,
        forceRls: row?.force_rls === true,
        policyCount: Number(row?.policy_count ?? 0),
      };
    });
    const missingBoundary = requiredInventory.filter(
      (row) => !row.exists || !row.rlsEnabled || !row.forceRls || row.policyCount < 1,
    );
    if (missingBoundary.length > 0) {
      throw new Error(`required_commercial_rls_boundary_incomplete:${missingBoundary.map((row) => row.table).join(',')}`);
    }
    checks.requiredCommercialTablesForceRls = true;

    const ctx = await setup(admin, suffix, created);
    const tenantA = await signIn(url, anonKey, ctx.actorA, 'tenant_a');
    const tenantB = await signIn(url, anonKey, ctx.actorB, 'tenant_b');
    const tenantU = await signIn(url, anonKey, ctx.actorU, 'tenant_unlicensed');

    await expectSingleRow(
      () => tenantA.from('ai_systems').select('id').eq('id', ctx.aiA.id),
      'licensed_same_tenant_read',
    );
    checks.licensedSameTenantRead = true;

    const sameInsert = await expectSingleRow(
      () => tenantA.from('ai_systems').insert({
        organization_id: ctx.orgA.id,
        name: `Post V20 same tenant ${suffix}`,
        use_case: 'post-v20 same tenant proof',
        created_by: ctx.actorA.id,
      }).select('id'),
      'licensed_same_tenant_insert',
    );
    created.rows.push(['ai_systems', sameInsert.id]);
    checks.licensedSameTenantInsert = true;

    await expectNoVisibleRows(
      () => tenantA.from('ai_systems').select('id').eq('id', ctx.aiB.id),
      'cross_tenant_read',
    );
    checks.crossTenantReadDenied = true;

    await expectExplicitDenial(
      () => tenantA.from('ai_systems').insert({
        organization_id: ctx.orgB.id,
        name: `Forbidden cross tenant ${suffix}`,
        use_case: 'post-v20 cross tenant proof',
        created_by: ctx.actorA.id,
      }),
      'cross_tenant_insert',
    );
    checks.crossTenantInsertDenied = true;

    await expectNoVisibleRows(
      () => tenantA.from('ai_systems').update({ name: `Forbidden mutation ${suffix}` }).eq('id', ctx.aiB.id).select('id'),
      'cross_tenant_update',
    );
    await verifyRowUnchanged(admin, 'ai_systems', ctx.aiB.id, 'name', ctx.aiB.name, 'cross_tenant_update');
    checks.crossTenantUpdateDenied = true;

    await expectNoVisibleRows(
      () => tenantA.from('ai_systems').delete().eq('id', ctx.aiB.id).select('id'),
      'cross_tenant_delete',
    );
    await verifyRowUnchanged(admin, 'ai_systems', ctx.aiB.id, 'name', ctx.aiB.name, 'cross_tenant_delete');
    checks.crossTenantDeleteDenied = true;

    await expectNoVisibleRows(
      () => tenantU.from('ai_systems').select('id').eq('id', ctx.aiU.id),
      'unlicensed_same_tenant_read',
    );
    checks.unlicensedSameTenantReadDenied = true;

    await expectExplicitDenial(
      () => tenantU.from('ai_systems').insert({
        organization_id: ctx.orgU.id,
        name: `Forbidden unlicensed insert ${suffix}`,
        use_case: 'post-v20 unlicensed proof',
        created_by: ctx.actorU.id,
      }),
      'unlicensed_same_tenant_insert',
    );
    checks.unlicensedSameTenantInsertDenied = true;

    await expectNoVisibleRows(
      () => anon.from('ai_systems').select('id').eq('id', ctx.aiA.id),
      'anonymous_paid_table_read',
    );
    checks.anonymousPaidTableReadDenied = true;

    await expectExplicitDenial(
      () => tenantA.from('regulatory_updates').select('id').eq('id', ctx.regulatory.id),
      'regulatory_updates_authenticated_read',
    );
    checks.regulatoryUpdatesBackendOnly = true;

    await expectExplicitDenial(
      () => tenantA.rpc('eurocomply_live_rls_inventory', { table_names: ['ai_systems'] }),
      'authenticated_inventory_helper',
    );
    checks.inventoryHelperServiceRoleOnly = true;

    await expectExplicitDenial(
      () => tenantA.from('compliance_evidence').select('id').limit(1),
      'legacy_compliance_evidence_read',
    );
    checks.legacyEvidenceBrowserSurfaceRevoked = true;

    await expectExplicitDenial(
      () => tenantU.from('evidence_items').insert({
        organization_id: ctx.orgU.id,
        user_id: ctx.actorU.id,
        title: 'Forbidden unlicensed Evidence Vault insert',
        evidence_type: 'document',
        status: 'draft',
        article_refs: [],
      }),
      'unlicensed_evidence_items_insert',
    );
    checks.evidenceVaultPaymentFirstInsertDenied = true;

    const { data: bucket, error: bucketError } = await admin.storage.getBucket('compliance-evidence');
    if (bucketError || !bucket || bucket.public !== false) {
      throw new Error(`evidence_bucket_not_private:${bucketError?.message ?? 'invalid_bucket'}`);
    }
    checks.evidenceVaultBucketPrivate = true;

    const orphanEvidenceId = crypto.randomUUID();
    await expectExplicitDenial(
      () => tenantA.storage.from('compliance-evidence').upload(
        `${ctx.orgA.id}/${orphanEvidenceId}/orphan.txt`,
        Buffer.from('bounded post-v20 runtime proof\n', 'utf8'),
        { upsert: false, contentType: 'text/plain' },
      ),
      'evidence_storage_orphan_insert',
    );
    checks.evidenceStorageRequiresCanonicalMetadata = true;

    await expectSingleRow(
      () => tenantB.from('ai_systems').select('id').eq('id', ctx.aiB.id),
      'licensed_tenant_b_read',
    );
    checks.tenantBIndependentAuthority = true;
  } catch (error) {
    proofError = error instanceof Error ? error : new Error(String(error));
  }

  try {
    await cleanup(admin, created);
    checks.fixtureCleanup = true;
  } catch (error) {
    cleanupError = error instanceof Error ? error : new Error(String(error));
    checks.fixtureCleanup = false;
  }

  const passed = !proofError && !cleanupError && Object.values(checks).every((value) => value === true);
  const payload = {
    schema: 'risck-comply.supabase-post-v20-runtime-proof.v1',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'failed',
    targetSha,
    promotionRunId,
    checkedAt: now(),
    supabaseProjectReference: redactedProjectReference(url),
    supabaseProjectReferenceRedacted: true,
    checks,
    coverage: {
      requiredCommercialTables,
      optionalCommercialTablesObserved: optionalCommercialTables,
      postgrestAuthenticatedTenantAB: true,
      paymentFirstLicensedAndUnlicensed: true,
      regulatoryUpdatesBackendOnly: true,
      evidenceVaultLiveNegativeBoundary: true,
      evidenceVaultDisposablePositiveBoundaryRequiredSeparately: true,
    },
    fixturePolicy: {
      syntheticOnly: true,
      providerEventsCreated: false,
      stripeLifecycleSynthesized: false,
      retainedCustomerData: false,
      cleanupRequired: true,
      cleanupPassed: checks.fixtureCleanup === true,
    },
    failures: [proofError?.message, cleanupError?.message].filter(Boolean),
  };
  writeEvidence(payload);

  if (!passed) {
    throw new Error(payload.failures.join('; ') || 'post_v20_runtime_proof_failed');
  }

  process.stdout.write('Supabase post-V20 Production runtime proof: Complete/passed\n');
}

runProof().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
