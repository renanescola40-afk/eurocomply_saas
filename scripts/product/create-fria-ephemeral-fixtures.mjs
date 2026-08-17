#!/usr/bin/env node

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
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

function mask(value) {
  if (value) process.stdout.write(`::add-mask::${value}\n`);
}

function exportEnv(name, value) {
  if (!process.env.GITHUB_ENV) throw new Error('github_env_required');
  mask(value);
  appendFileSync(process.env.GITHUB_ENV, `${name}=${value}\n`, 'utf8');
}

async function createUser(admin, label, suffix) {
  const email = `fria-${label}-${suffix}@example.test`;
  const secret = password();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: secret,
    email_confirm: true,
    user_metadata: { purpose: `fria-ephemeral-${label}`, preferred_language: 'en' },
  });
  if (error || !data.user?.id) throw new Error(`fria_${label}_user_create_failed`);
  return { id: data.user.id, email, password: secret };
}

async function insertOne(admin, table, row, label) {
  const { data, error } = await admin.from(table).insert(row).select('*').single();
  if (error || !data?.id) throw new Error(`${label}_create_failed`);
  return data;
}

async function main() {
  if (env('GITHUB_ACTIONS') !== 'true') throw new Error('github_actions_required');
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const parsed = new URL(url);
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(parsed.hostname)) {
    throw new Error('fria_ephemeral_supabase_must_be_loopback');
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const suffix = `${Date.now()}-${randomUUID()}`;
  const owner = await createUser(admin, 'owner', suffix);
  const reviewer = await createUser(admin, 'reviewer', suffix);
  const approver = await createUser(admin, 'approver', suffix);

  const organization = await insertOne(admin, 'organizations', {
    name: `FRIA Disposable QA ${suffix}`,
    slug: `fria-qa-${suffix}`,
    created_by: owner.id,
  }, 'fria_organization');

  for (const [identity, role] of [[owner, 'owner'], [reviewer, 'admin'], [approver, 'admin']]) {
    await insertOne(admin, 'organization_members', {
      organization_id: organization.id,
      user_id: identity.id,
      role,
    }, `fria_${role}_membership`);
  }

  // Commercial Product acceptance must exercise the same durable authority used
  // by the runtime. This is deliberately NOT a seeded subscriptions row or fake
  // Stripe event: the disposable tenant receives a current signed-contract source
  // with an applied Professional entitlement snapshot, which satisfies both the
  // dashboard license boundary and the FRIA Professional+ API gate.
  const effectiveFrom = new Date(Date.now() - 60_000).toISOString();
  const commercialPayload = JSON.stringify({
    purpose: 'fria-ephemeral-product-acceptance',
    organizationId: organization.id,
    planCode: 'professional',
    sourceVersion: 1,
  });
  const payloadSha256 = createHash('sha256').update(commercialPayload).digest('hex');
  const commercialAuthority = await insertOne(admin, 'enterprise_entitlement_sources', {
    organization_id: organization.id,
    source_kind: 'signed_contract',
    external_reference: `fria-qa-professional-${suffix}`,
    priority: 900,
    active: true,
    version: 1,
    effective_from: effectiveFrom,
    effective_until: null,
  }, 'fria_commercial_authority');

  await insertOne(admin, 'enterprise_entitlement_snapshots', {
    organization_id: organization.id,
    source_id: commercialAuthority.id,
    idempotency_key: `fria-qa-professional-${suffix}`,
    source_version: 1,
    plan_code: 'professional',
    full_seat_limit: 10,
    participant_seat_limit: 10,
    viewer_seat_limit: 10,
    entitlements: {
      purpose: 'fria-ephemeral-product-acceptance',
      commercialAuthority: 'signed_contract',
    },
    source_payload_sha256: payloadSha256,
    observed_at: effectiveFrom,
    valid_from: effectiveFrom,
    valid_until: null,
    status: 'applied',
    applied_policy_version: 1,
  }, 'fria_commercial_entitlement_snapshot');

  const { data: authorityProof, error: authorityProofError } = await admin
    .from('enterprise_entitlement_snapshots')
    .select('plan_code,status,source_id')
    .eq('organization_id', organization.id)
    .eq('source_id', commercialAuthority.id)
    .eq('status', 'applied')
    .single();
  if (
    authorityProofError
    || authorityProof?.plan_code !== 'professional'
    || authorityProof?.source_id !== commercialAuthority.id
  ) {
    throw new Error('fria_commercial_authority_verification_failed');
  }

  exportEnv('E2E_FRIA_OWNER_EMAIL', owner.email);
  exportEnv('E2E_FRIA_OWNER_PASSWORD', owner.password);
  exportEnv('E2E_FRIA_REVIEWER_EMAIL', reviewer.email);
  exportEnv('E2E_FRIA_APPROVER_EMAIL', approver.email);
  exportEnv('E2E_FRIA_APPROVER_PASSWORD', approver.password);
  appendFileSync(process.env.GITHUB_ENV, 'E2E_ALLOW_SYNTHETIC_APP_WRITES=true\n', 'utf8');

  process.stdout.write('Disposable FRIA identities, tenant and Professional signed-contract authority created on loopback Supabase.\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
