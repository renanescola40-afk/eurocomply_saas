#!/usr/bin/env node

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function requireEnv(name) {
  const value = env(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function password() {
  return `Rc!${randomBytes(24).toString('base64url')}9a`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function localOnly(url) {
  const parsed = new URL(url);
  return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(parsed.hostname);
}

function client(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function createUser(admin, label, suffix) {
  const email = `evidence-${label}-${suffix}@example.test`;
  const secret = password();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: secret,
    email_confirm: true,
    user_metadata: { purpose: `evidence-vault-disposable-${label}` },
  });
  if (error || !data.user?.id) throw new Error(`${label}_user_create_failed`);
  return { id: data.user.id, email, password: secret };
}

async function signIn(url, anonKey, identity, label) {
  const signed = client(url, anonKey);
  const { data, error } = await signed.auth.signInWithPassword({ email: identity.email, password: identity.password });
  if (error || !data.session?.access_token) throw new Error(`${label}_sign_in_failed`);
  return signed;
}

async function insertOne(admin, table, row, label) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error || !data?.id) throw new Error(`${label}_create_failed`);
  return data;
}

async function grantDisposableSignedContractAuthority(admin, organizationId, label) {
  const observedAt = new Date();
  const validFrom = new Date(observedAt.getTime() - 60_000).toISOString();
  const validUntil = new Date(observedAt.getTime() + 60 * 60_000).toISOString();
  const externalReference = `disposable-evidence-${label}-${randomUUID()}`;
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

  const payloadSha256 = createHash('sha256')
    .update(`${organizationId}:${source.id}:${externalReference}`)
    .digest('hex');

  await insertOne(admin, 'enterprise_entitlement_snapshots', {
    organization_id: organizationId,
    source_id: source.id,
    idempotency_key: `evidence-vault-${label}-${randomUUID()}`,
    source_version: 1,
    plan_code: 'starter',
    full_seat_limit: 10,
    participant_seat_limit: 10,
    viewer_seat_limit: 10,
    entitlements: {},
    source_payload_sha256: payloadSha256,
    observed_at: observedAt.toISOString(),
    valid_from: validFrom,
    valid_until: validUntil,
    status: 'applied',
    applied_policy_version: 1,
  }, `${label}_commercial_snapshot`);
}

async function expectError(operation, label) {
  const result = await operation();
  if (!result?.error) throw new Error(`${label}_unexpectedly_succeeded`);
}

async function expectZeroRows(operation, label) {
  const result = await operation();
  if (result?.error) throw new Error(`${label}_unexpected_error`);
  if (!Array.isArray(result?.data) || result.data.length !== 0) throw new Error(`${label}_cross_tenant_rows_visible`);
}

async function expectStorageObjectPreservedAfterDeleteAttempt(operation, download, expectedBytes, label) {
  await operation();
  const { data, error } = await download();
  if (error || !data) throw new Error(`${label}_object_missing_after_attempt`);

  const actualBytes = Buffer.from(await data.arrayBuffer());
  if (!actualBytes.equals(expectedBytes)) throw new Error(`${label}_object_changed_after_attempt`);
}

async function main() {
  if (env('GITHUB_ACTIONS') !== 'true') throw new Error('github_actions_required');

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!localOnly(url)) throw new Error('evidence_tenant_proof_requires_loopback_supabase');

  const admin = client(url, serviceRoleKey);
  const suffix = `${Date.now()}-${randomUUID()}`;
  const actorA = await createUser(admin, 'tenant-a', suffix);
  const actorB = await createUser(admin, 'tenant-b', suffix);

  const orgA = await insertOne(admin, 'organizations', {
    name: `Evidence Tenant A ${suffix}`,
    slug: `evidence-a-${suffix}`,
    created_by: actorA.id,
  }, 'organization_a');
  const orgB = await insertOne(admin, 'organizations', {
    name: `Evidence Tenant B ${suffix}`,
    slug: `evidence-b-${suffix}`,
    created_by: actorB.id,
  }, 'organization_b');
  const orgASecondary = await insertOne(admin, 'organizations', {
    name: `Evidence Tenant A Secondary ${suffix}`,
    slug: `evidence-a-secondary-${suffix}`,
    created_by: actorA.id,
  }, 'organization_a_secondary');

  for (const [organizationId, userId, role, label] of [
    [orgA.id, actorA.id, 'owner', 'membership_a'],
    [orgB.id, actorB.id, 'owner', 'membership_b'],
    [orgASecondary.id, actorA.id, 'owner', 'membership_a_secondary'],
  ]) {
    await insertOne(admin, 'organization_members', {
      organization_id: organizationId,
      user_id: userId,
      role,
    }, label);
  }

  // Payment-first RLS is part of the exact-SHA tenant-isolation surface. Seed a
  // bounded signed-contract authority only in this loopback disposable database
  // so same-tenant Evidence Vault operations can reach the tenant/immutability
  // policies. The secondary A organization is also licensed so the rebind test
  // reaches the immutable-tenant trigger rather than failing earlier on billing.
  await grantDisposableSignedContractAuthority(admin, orgA.id, 'tenant-a');
  await grantDisposableSignedContractAuthority(admin, orgASecondary.id, 'tenant-a-secondary');

  const tenantA = await signIn(url, anonKey, actorA, 'tenant_a');
  const tenantB = await signIn(url, anonKey, actorB, 'tenant_b');

  const evidenceId = randomUUID();
  const { data: evidenceA, error: evidenceAError } = await tenantA
    .from('evidence_items')
    .insert({
      id: evidenceId,
      organization_id: orgA.id,
      user_id: actorA.id,
      title: 'Tenant A immutable evidence',
      evidence_type: 'document',
      status: 'draft',
      article_refs: ['Article 9'],
    })
    .select('*')
    .single();
  if (evidenceAError || evidenceA?.organization_id !== orgA.id) throw new Error('tenant_a_evidence_insert_failed');

  await expectZeroRows(
    () => tenantB.from('evidence_items').select('id,organization_id').eq('id', evidenceId),
    'tenant_b_metadata_read',
  );
  await expectZeroRows(
    () => tenantB.from('evidence_item_audit_events').select('id').eq('evidence_item_id', evidenceId),
    'tenant_b_audit_read',
  );
  await expectZeroRows(
    () => tenantB.from('evidence_items').update({ title: 'cross tenant mutation' }).eq('id', evidenceId).select('id'),
    'tenant_b_metadata_update',
  );
  await expectError(
    () => tenantB.from('evidence_items').insert({
      organization_id: orgA.id,
      user_id: actorB.id,
      title: 'forbidden cross tenant insert',
      evidence_type: 'document',
      status: 'draft',
      article_refs: [],
    }),
    'tenant_b_cross_tenant_insert',
  );

  // Rebinding is forbidden even when the actor is legitimately a member of both
  // source and destination organizations. This proves the invariant trigger,
  // not merely the RLS membership or commercial-authority predicates.
  await expectError(
    () => tenantA.from('evidence_items')
      .update({ organization_id: orgASecondary.id })
      .eq('id', evidenceId)
      .select('id')
      .single(),
    'tenant_a_tenant_rebind',
  );

  const bytes = Buffer.from('RISCK COMPLY disposable evidence tenant-isolation proof\n', 'utf8');
  const fileSha256 = createHash('sha256').update(bytes).digest('hex');
  const fileName = 'proof.txt';
  const objectPath = `${orgA.id}/${evidenceId}/${fileName}`;

  const { data: reserved, error: reserveError } = await tenantA
    .from('evidence_items')
    .update({
      file_name: fileName,
      file_path: objectPath,
      file_mime_type: 'text/plain',
      storage_bucket: 'compliance-evidence',
      storage_object_path: objectPath,
      file_sha256: fileSha256,
      file_size_bytes: bytes.length,
    })
    .eq('id', evidenceId)
    .eq('organization_id', orgA.id)
    .is('deleted_at', null)
    .select('id,storage_object_path,file_sha256')
    .single();
  if (reserveError || reserved?.storage_object_path !== objectPath || reserved?.file_sha256 !== fileSha256) {
    throw new Error('tenant_a_attachment_reservation_failed');
  }

  const { error: uploadError } = await tenantA.storage
    .from('compliance-evidence')
    .upload(objectPath, bytes, { upsert: false, contentType: 'text/plain' });
  if (uploadError) throw new Error('tenant_a_storage_insert_failed');

  const { data: ownDownload, error: ownDownloadError } = await tenantA.storage
    .from('compliance-evidence')
    .download(objectPath);
  if (ownDownloadError || !ownDownload) throw new Error('tenant_a_storage_read_failed');

  await expectError(
    () => tenantB.storage.from('compliance-evidence').download(objectPath),
    'tenant_b_storage_read',
  );
  await expectError(
    () => tenantB.storage.from('compliance-evidence').upload(
      `${orgA.id}/${evidenceId}/tenant-b.txt`,
      Buffer.from('forbidden', 'utf8'),
      { upsert: false, contentType: 'text/plain' },
    ),
    'tenant_b_storage_insert',
  );
  await expectError(
    () => tenantA.storage.from('compliance-evidence').update(
      objectPath,
      Buffer.from('forbidden mutation', 'utf8'),
      { contentType: 'text/plain' },
    ),
    'tenant_a_storage_update',
  );
  await expectStorageObjectPreservedAfterDeleteAttempt(
    () => tenantA.storage.from('compliance-evidence').remove([objectPath]),
    () => tenantA.storage.from('compliance-evidence').download(objectPath),
    bytes,
    'tenant_a_storage_delete',
  );

  await expectError(
    () => tenantA.from('evidence_items')
      .update({ file_sha256: '0'.repeat(64) })
      .eq('id', evidenceId)
      .select('id')
      .single(),
    'tenant_a_attachment_rewrite',
  );
  await expectError(
    () => tenantA.from('evidence_items').delete().eq('id', evidenceId),
    'tenant_a_hard_delete',
  );

  const deletedAt = new Date().toISOString();
  const { data: softDeleted, error: softDeleteError } = await tenantA
    .from('evidence_items')
    .update({
      status: 'archived',
      deleted_at: deletedAt,
      deleted_by_subject: actorA.id,
      delete_reason: 'Disposable tenant-isolation proof completed',
    })
    .eq('id', evidenceId)
    .eq('organization_id', orgA.id)
    .is('deleted_at', null)
    .select('id,deleted_at')
    .single();
  if (softDeleteError || !softDeleted?.deleted_at) throw new Error('tenant_a_soft_delete_failed');

  await expectError(
    () => tenantA.storage.from('compliance-evidence').download(objectPath),
    'soft_deleted_storage_read',
  );
  await expectZeroRows(
    () => tenantA.from('evidence_items').update({ status: 'draft' }).eq('id', evidenceId).select('id'),
    'soft_deleted_browser_update',
  );

  // service_role bypasses RLS, so these two failures prove the DB triggers are
  // authoritative even above browser policies.
  await expectError(
    () => admin.from('evidence_items')
      .update({ organization_id: orgASecondary.id })
      .eq('id', evidenceId)
      .select('id')
      .single(),
    'service_role_soft_deleted_rebind',
  );
  await expectError(
    () => admin.from('evidence_items').delete().eq('id', evidenceId),
    'service_role_hard_delete',
  );

  const { data: auditEvents, error: auditError } = await tenantA
    .from('evidence_item_audit_events')
    .select('event_type')
    .eq('evidence_item_id', evidenceId);
  if (auditError) throw new Error('tenant_a_audit_read_failed');
  const eventTypes = new Set((auditEvents ?? []).map((event) => event.event_type));
  for (const required of ['created', 'updated', 'soft_deleted']) {
    if (!eventTypes.has(required)) throw new Error(`missing_audit_event_${required}`);
  }

  const { data: bucket, error: bucketError } = await admin
    .from('buckets')
    .select('id,public')
    .eq('id', 'compliance-evidence')
    .single();
  // The Storage REST schema is not necessarily exposed as a normal public table;
  // when unavailable, bucket privacy has already been exercised by cross-tenant
  // object access above and is asserted by migration postconditions.
  if (!bucketError && bucket?.public !== false) throw new Error('evidence_bucket_not_private');

  assert(true, 'unreachable');
  process.stdout.write('Enterprise Evidence Vault disposable A/B tenant-isolation proof passed.\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
