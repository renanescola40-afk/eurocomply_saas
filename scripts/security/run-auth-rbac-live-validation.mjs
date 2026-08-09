import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';

import {
  cleanupEphemeralAuthFixtures,
  createEphemeralAuthFixtures,
} from './lib/ephemeral-auth-fixtures.mjs';

const OUTPUT = 'docs/security/evidence/runtime/auth-rbac-final-validation.json';
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const REDACTION = 'Redaction confirmed for runtime evidence.';

function env(name) {
  return String(process.env[name] ?? '').trim();
}

function fullSha(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return /^[0-9a-f]{40}$/.test(normalized) ? normalized : null;
}

function gitHead() {
  try {
    return fullSha(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }));
  } catch {
    return null;
  }
}

function safeHost(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.hostname : null;
  } catch {
    return null;
  }
}

function client(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function signIn(label, credentials, url, anonKey) {
  const supabase = client(url, anonKey);
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error || !data.user || !data.session) throw new Error(`${label}_sign_in_failed`);
  return { supabase, userId: data.user.id };
}

async function refreshSession(identity) {
  const { data, error } = await identity.supabase.auth.refreshSession();
  return !error
    && Boolean(data.session?.access_token)
    && Boolean(data.session?.refresh_token)
    && data.user?.id === identity.userId;
}

async function visibleOrganization(supabase, organizationId) {
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .maybeSingle();
  if (error) throw new Error('organization_query_failed');
  return Boolean(data?.id);
}

async function visibleMembership(supabase, organizationId, userId) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id,user_id,role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('membership_query_failed');
  return data ?? null;
}

async function deniedMutation(query, label) {
  const { data, error } = await query.select();
  if (error) return true;
  if (!Array.isArray(data)) throw new Error(`${label}_unexpected_response`);
  return data.length === 0;
}

async function signOut(session) {
  const { error } = await session.supabase.auth.signOut();
  return !error;
}

export function evaluate({ checks, provenance }) {
  const allChecksPassed = Object.values(checks).every(Boolean);
  const trusted = provenance.githubActions
    && provenance.repository === REPOSITORY
    && provenance.branch === 'main'
    && Boolean(provenance.runId)
    && Boolean(provenance.expectedSha)
    && provenance.expectedSha === provenance.checkedOutSha;
  return { complete: allChecksPassed && trusted, allChecksPassed, trusted };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const expectedSha = fullSha(env('ENTERPRISE_EXPECTED_SHA'));
  const checkedOutSha = gitHead();
  const provenance = {
    githubActions: env('GITHUB_ACTIONS') === 'true',
    repository: env('GITHUB_REPOSITORY'),
    branch: env('ENTERPRISE_EXPECTED_BRANCH'),
    runId: /^\d+$/.test(env('GITHUB_RUN_ID')) ? env('GITHUB_RUN_ID') : null,
    expectedSha,
    checkedOutSha,
  };

  const required = {
    url: Boolean(safeHost(url)),
    anonKey: Boolean(anonKey),
    serviceRoleKey: Boolean(serviceRoleKey),
  };

  const checks = {
    fixtureConfigurationPresent: Object.values(required).every(Boolean),
    ephemeralFixturesCreated: false,
    ownerRoleObserved: false,
    memberRoleObserved: false,
    ownerCanReadOwnTenant: false,
    memberCanReadOwnTenant: false,
    outsiderCannotReadTenantA: false,
    ownerCannotReadTenantB: false,
    outsiderCanReadOwnTenant: false,
    crossTenantMembershipHidden: false,
    crossTenantMembershipInsertDenied: false,
    crossTenantMembershipUpdateDenied: false,
    crossTenantMembershipDeleteDenied: false,
    crossTenantOrganizationUpdateDenied: false,
    crossTenantOrganizationDeleteDenied: false,
    sessionRefresh: false,
    sessionsRevoked: false,
    ephemeralFixturesCleanup: false,
  };
  const failures = [];
  const admin = serviceRoleKey && url ? client(url, serviceRoleKey) : null;
  let fixtures = null;
  let sessions = [];

  try {
    if (!checks.fixtureConfigurationPresent || !admin) throw new Error('provider_configuration_missing');

    fixtures = await createEphemeralAuthFixtures(admin, { purpose: 'auth-rbac-live-proof' });
    checks.ephemeralFixturesCreated = true;

    const owner = await signIn(
      'owner',
      { email: fixtures.owner.email, password: fixtures.owner.password },
      url,
      anonKey,
    );
    const member = await signIn(
      'member',
      { email: fixtures.member.email, password: fixtures.member.password },
      url,
      anonKey,
    );
    const outsider = await signIn(
      'outsider',
      { email: fixtures.outsider.email, password: fixtures.outsider.password },
      url,
      anonKey,
    );
    sessions = [owner, member, outsider];

    checks.sessionRefresh = await refreshSession(owner);
    const organizationA = fixtures.organizationA.id;
    const organizationB = fixtures.organizationB.id;
    const ownerMembership = await visibleMembership(owner.supabase, organizationA, owner.userId);
    const memberMembership = await visibleMembership(member.supabase, organizationA, member.userId);
    checks.ownerRoleObserved = ownerMembership?.role === 'owner';
    checks.memberRoleObserved = memberMembership?.role === 'member';
    checks.ownerCanReadOwnTenant = await visibleOrganization(owner.supabase, organizationA);
    checks.memberCanReadOwnTenant = await visibleOrganization(member.supabase, organizationA);
    checks.outsiderCannotReadTenantA = !(await visibleOrganization(outsider.supabase, organizationA));
    checks.ownerCannotReadTenantB = !(await visibleOrganization(owner.supabase, organizationB));
    checks.outsiderCanReadOwnTenant = await visibleOrganization(outsider.supabase, organizationB);
    checks.crossTenantMembershipHidden = !(await visibleMembership(outsider.supabase, organizationA, owner.userId));

    checks.crossTenantMembershipInsertDenied = await deniedMutation(
      outsider.supabase.from('organization_members').insert({
        organization_id: organizationA,
        user_id: outsider.userId,
        role: 'owner',
      }),
      'cross_tenant_membership_insert',
    );
    checks.crossTenantMembershipUpdateDenied = await deniedMutation(
      outsider.supabase
        .from('organization_members')
        .update({ role: 'owner' })
        .eq('organization_id', organizationA)
        .eq('user_id', owner.userId),
      'cross_tenant_membership_update',
    );
    checks.crossTenantMembershipDeleteDenied = await deniedMutation(
      outsider.supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationA)
        .eq('user_id', owner.userId),
      'cross_tenant_membership_delete',
    );
    checks.crossTenantOrganizationUpdateDenied = await deniedMutation(
      outsider.supabase
        .from('organizations')
        .update({ updated_at: generatedAt })
        .eq('id', organizationA),
      'cross_tenant_organization_update',
    );
    checks.crossTenantOrganizationDeleteDenied = await deniedMutation(
      outsider.supabase.from('organizations').delete().eq('id', organizationA),
      'cross_tenant_organization_delete',
    );
  } catch (error) {
    failures.push(error instanceof Error ? error.message : 'unknown_validation_failure');
  } finally {
    if (sessions.length > 0) {
      checks.sessionsRevoked = (await Promise.all(sessions.map(signOut))).every(Boolean);
    }
    if (admin && fixtures?.created) {
      const cleanup = await cleanupEphemeralAuthFixtures(admin, fixtures.created);
      checks.ephemeralFixturesCleanup = cleanup.verified;
      failures.push(...cleanup.failures);
    }
  }

  const decision = evaluate({ checks, provenance });
  const evidence = {
    schema: 'risck-comply.auth-rbac-runtime-evidence.v2',
    evidenceItem: 'auth-rbac-final-validation',
    status: decision.complete ? 'Complete' : 'Open',
    outcome: decision.complete ? 'passed' : (failures.length ? 'failed' : 'blocked'),
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY protected runtime automation',
    repository: REPOSITORY,
    branch: provenance.branch || null,
    targetSha: expectedSha,
    checkedOutSha,
    environment: 'production-auth-rbac-validation',
    providerHost: safeHost(url),
    summary: decision.complete
      ? 'Protected live validation created disposable Supabase identities and tenants, proved password authentication, expected RBAC roles, same-tenant access, cross-tenant read and mutation denial, session refresh and revocation, then verified same-run fixture cleanup.'
      : 'Protected Auth/RBAC and tenant-mutation runtime proof is incomplete or failed; enterprise release remains blocked until every live check and disposable-fixture cleanup check passes for the exact main SHA.',
    productionGate: decision.complete ? 'eligible for downstream enterprise gates' : 'blocked',
    completionRule: 'Run the protected Auth RBAC Tenant Proof workflow for the exact current main SHA. The workflow creates, uses and removes all synthetic identities, organizations and memberships in the same protected run.',
    checks,
    provenance: { ...provenance, exactShaBound: expectedSha !== null && expectedSha === checkedOutSha },
    failures: [...new Set(failures)],
    evidenceLocations: [
      'scripts/security/lib/ephemeral-auth-fixtures.mjs',
      'scripts/security/run-auth-rbac-live-validation.mjs',
      '.github/workflows/auth-rbac-runtime-proof.yml',
      'docs/security/evidence/runtime/auth-rbac-final-validation.json',
    ],
    controlsVerified: decision.complete ? [
      'Disposable Supabase users, organizations and memberships are created by the protected proof and removed in the same run.',
      'Supabase password authentication works for disposable owner, member and outsider identities.',
      'A synthetic authenticated session refresh succeeds without persisting token values.',
      'Owner and member roles are observed through tenant-scoped organization_members reads.',
      'Authorized synthetic users can read their own organization.',
      'Cross-tenant organization and membership reads are denied by runtime policy.',
      'Cross-tenant organization and membership inserts, updates and deletes are denied.',
      'Synthetic validation sessions are revoked after execution.',
      'Synthetic identity and tenant cleanup is verified after execution.',
      'Evidence is bound to the exact protected main-branch release SHA.',
    ] : [],
    redactionConfirmation: REDACTION,
    evidenceIntegrity: {
      placeholderOnly: !decision.complete,
      runtimeProofInvented: false,
      customerFacingProof: false,
      rawCredentialsStored: false,
      serviceRoleKeyStored: false,
      disposablePasswordStored: false,
      accessTokensStored: false,
      userIdentifiersStored: false,
      organizationIdentifiersStored: false,
      rawProviderResponsesStored: false,
      cleanupRequired: true,
      cleanupVerified: checks.ephemeralFixturesCleanup,
    },
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(`Auth/RBAC runtime evidence: ${evidence.status}/${evidence.outcome}`);
  if (!decision.complete) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
