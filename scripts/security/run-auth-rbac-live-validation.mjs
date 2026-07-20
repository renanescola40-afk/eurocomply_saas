import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

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

async function disposableSignup({ url, anonKey, serviceRoleKey, emailDomain }) {
  const suffix = randomBytes(12).toString('hex');
  const email = `enterprise-proof-${suffix}@${emailDomain}`;
  const password = `Rc!${randomBytes(24).toString('base64url')}9a`;
  const anon = client(url, anonKey);
  const admin = client(url, serviceRoleKey);
  let userId = null;
  let created = false;
  let cleanup = false;

  try {
    const { data, error } = await anon.auth.signUp({ email, password });
    if (error || !data.user?.id) throw new Error('disposable_signup_failed');
    userId = data.user.id;
    created = true;
    return { created, cleanup: false, userId };
  } finally {
    if (userId) {
      const { error } = await admin.auth.admin.deleteUser(userId, true);
      cleanup = !error;
    }
    if (!cleanup && created) throw new Error('disposable_signup_cleanup_failed');
  }
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
  const disposableEmailDomain = env('AUTH_RBAC_DISPOSABLE_EMAIL_DOMAIN');
  const organizationA = env('AUTH_RBAC_ORGANIZATION_A_ID');
  const organizationB = env('AUTH_RBAC_ORGANIZATION_B_ID');
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
    disposableEmailDomain: /^[a-z0-9.-]+$/i.test(disposableEmailDomain),
    organizationA: Boolean(organizationA),
    organizationB: Boolean(organizationB),
    ownerEmail: Boolean(env('AUTH_RBAC_OWNER_EMAIL')),
    ownerPassword: Boolean(env('AUTH_RBAC_OWNER_PASSWORD')),
    memberEmail: Boolean(env('AUTH_RBAC_MEMBER_EMAIL')),
    memberPassword: Boolean(env('AUTH_RBAC_MEMBER_PASSWORD')),
    outsiderEmail: Boolean(env('AUTH_RBAC_OUTSIDER_EMAIL')),
    outsiderPassword: Boolean(env('AUTH_RBAC_OUTSIDER_PASSWORD')),
  };

  const checks = {
    fixtureConfigurationPresent: Object.values(required).every(Boolean),
    disposableSignup: false,
    disposableSignupCleanup: false,
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
  };
  const failures = [];
  let sessions = [];

  try {
    if (!checks.fixtureConfigurationPresent) throw new Error('fixture_configuration_missing');

    const signup = await disposableSignup({ url, anonKey, serviceRoleKey, emailDomain: disposableEmailDomain });
    checks.disposableSignup = signup.created;
    checks.disposableSignupCleanup = true;

    const owner = await signIn('owner', { email: env('AUTH_RBAC_OWNER_EMAIL'), password: env('AUTH_RBAC_OWNER_PASSWORD') }, url, anonKey);
    const member = await signIn('member', { email: env('AUTH_RBAC_MEMBER_EMAIL'), password: env('AUTH_RBAC_MEMBER_PASSWORD') }, url, anonKey);
    const outsider = await signIn('outsider', { email: env('AUTH_RBAC_OUTSIDER_EMAIL'), password: env('AUTH_RBAC_OUTSIDER_PASSWORD') }, url, anonKey);
    sessions = [owner, member, outsider];

    checks.sessionRefresh = await refreshSession(owner);
    const ownerMembership = await visibleMembership(owner.supabase, organizationA, owner.userId);
    const memberMembership = await visibleMembership(member.supabase, organizationA, member.userId);
    checks.ownerRoleObserved = ownerMembership?.role === 'owner';
    checks.memberRoleObserved = ['admin', 'member'].includes(String(memberMembership?.role ?? ''));
    checks.ownerCanReadOwnTenant = await visibleOrganization(owner.supabase, organizationA);
    checks.memberCanReadOwnTenant = await visibleOrganization(member.supabase, organizationA);
    checks.outsiderCannotReadTenantA = !(await visibleOrganization(outsider.supabase, organizationA));
    checks.ownerCannotReadTenantB = !(await visibleOrganization(owner.supabase, organizationB));
    checks.outsiderCanReadOwnTenant = await visibleOrganization(outsider.supabase, organizationB);
    checks.crossTenantMembershipHidden = !(await visibleMembership(outsider.supabase, organizationA, owner.userId));

    checks.crossTenantMembershipInsertDenied = await deniedMutation(
      outsider.supabase.from('organization_members').insert({ organization_id: organizationA, user_id: outsider.userId, role: 'owner' }),
      'cross_tenant_membership_insert',
    );
    checks.crossTenantMembershipUpdateDenied = await deniedMutation(
      outsider.supabase.from('organization_members').update({ role: 'owner' }).eq('organization_id', organizationA).eq('user_id', owner.userId),
      'cross_tenant_membership_update',
    );
    checks.crossTenantMembershipDeleteDenied = await deniedMutation(
      outsider.supabase.from('organization_members').delete().eq('organization_id', organizationA).eq('user_id', owner.userId),
      'cross_tenant_membership_delete',
    );
    checks.crossTenantOrganizationUpdateDenied = await deniedMutation(
      outsider.supabase.from('organizations').update({ updated_at: generatedAt }).eq('id', organizationA),
      'cross_tenant_organization_update',
    );
    checks.crossTenantOrganizationDeleteDenied = await deniedMutation(
      outsider.supabase.from('organizations').delete().eq('id', organizationA),
      'cross_tenant_organization_delete',
    );
  } catch (error) {
    failures.push(error instanceof Error ? error.message : 'unknown_validation_failure');
  } finally {
    if (sessions.length > 0) checks.sessionsRevoked = (await Promise.all(sessions.map(signOut))).every(Boolean);
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
      ? 'Protected live validation proved disposable signup and cleanup, authentication lifecycle, expected RBAC roles, same-tenant access, cross-tenant read and mutation denial, and session revocation for synthetic fixtures.'
      : 'Protected Auth/RBAC and tenant-mutation runtime proof is incomplete or failed; enterprise release remains blocked until every live check passes for the exact deployed main SHA.',
    productionGate: decision.complete ? 'eligible for downstream enterprise gates' : 'blocked',
    completionRule: 'Run the protected Auth RBAC Tenant Proof workflow for the exact deployed main SHA with disposable signup cleanup, three dedicated synthetic users and two isolated organizations.',
    checks,
    provenance: { ...provenance, exactShaBound: expectedSha !== null && expectedSha === checkedOutSha },
    failures,
    evidenceLocations: [
      'scripts/security/run-auth-rbac-live-validation.mjs',
      '.github/workflows/auth-rbac-runtime-proof.yml',
      'docs/security/evidence/runtime/auth-rbac-final-validation.json',
    ],
    controlsVerified: decision.complete ? [
      'Disposable password signup succeeds and the synthetic identity is deleted in the same protected run.',
      'Supabase password authentication works for dedicated synthetic fixtures.',
      'A synthetic authenticated session refresh succeeds without persisting token values.',
      'Owner and member roles are observed through tenant-scoped organization_members reads.',
      'Authorized users can read their own organization.',
      'Cross-tenant organization and membership reads are denied by runtime policy.',
      'Cross-tenant organization and membership inserts, updates and deletes are denied.',
      'Synthetic validation sessions are revoked after execution.',
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
      cleanupVerified: checks.disposableSignupCleanup,
    },
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(`Auth/RBAC runtime evidence: ${evidence.status}/${evidence.outcome}`);
  if (!decision.complete) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
