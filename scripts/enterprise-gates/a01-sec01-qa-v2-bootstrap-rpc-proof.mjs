#!/usr/bin/env node
// New V2 RPC proof, not a replay of provider_mfa evidence. QA protected job only.
// All fixture identities, credentials and raw response bodies remain in memory.
import { execFileSync } from 'node:child_process';
import { lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createEphemeralAuthFixtures, cleanupEphemeralAuthFixtures } from '../security/lib/ephemeral-auth-fixtures.mjs';
import { createEphemeralMfaUser, cleanupEphemeralMfaUser } from '../security/lib/ephemeral-mfa-fixture.mjs';
import { verifyQaSignedSessionId } from '../security/lib/qa-signed-session-id-proof.mjs';
import { probeSignedBootstrap, probeAnonymousBootstrapDenied, probeRevokedBootstrapDenied, probeInvalidBootstrapSignatureDenied } from '../security/lib/qa-v2-bootstrap-rpc-proof.mjs';

const qaRef = 'zrxrrfbllsxtleyxjpsz';
const qaUrl = 'https://' + qaRef + '.supabase.co';
const repo = 'renanescola40-afk/eurocomply_saas';
const env = process.env;
const output = 'artifacts/enterprise-sec01/qa-v2-bootstrap-rpc-evidence.json';
const checks = {
  isolatedContext: false, fixtureScopeReadback: false, anonymousDenied: false,
  ownAal1: false, secondTenantAal1: false, noMembershipAal1: false,
  ownAal2: false, invalidSignatureDenied: false, revokedSessionDenied: false,
  cleanupVerified: false,
};
let sourceSha = null;
let fixtures = null;
let unscoped = null;
let admin = null;
let baseline = null;
const clients = [];
let failure = 'preflight_failed';
const stop = code => { throw new Error(code); };
const client = key => createClient(qaUrl, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
function absentFile(name) {
  try { lstatSync(name); return false; } catch (e) { return e?.code === 'ENOENT'; }
}
async function login(fixture, publishableKey) {
  const supabase = client(publishableKey);
  clients.push({ supabase, signedOut: false });
  const { data, error } = await supabase.auth.signInWithPassword({ email: fixture.email, password: fixture.password });
  if (error || data?.user?.id !== fixture.id || !data?.session?.access_token
    || !await verifyQaSignedSessionId(supabase.auth, data.session.access_token, fixture.id, 'aal1')) stop('signed_aal1_failed');
  return { supabase, token: data.session.access_token };
}
async function readBaseline() {
  const tables = ['organizations','organization_members','organization_security_settings',
    'enterprise_contracts','organization_entitlements','organization_usage',
    'enterprise_entitlement_sources','enterprise_entitlement_snapshots','subscriptions','stripe_events_processed'];
  const counts = {};
  for (const table of tables) {
    const result = await admin.from(table).select('*', { head:true, count:'exact' });
    if (result.error || !Number.isInteger(result.count)) stop('fixture_baseline_unavailable');
    counts[table] = result.count;
  }
  const users = await admin.auth.admin.listUsers({page:1,perPage:100});
  if (users.error || !Array.isArray(users.data?.users) || users.data.users.length !== 5) stop('fixture_auth_baseline_unavailable');
  counts.authUsers = users.data.users.length;
  return counts;
}
async function readPolicies(fixture, expectedOrg) {
  const members = await admin.from('organization_members').select('organization_id,user_id,status,role').eq('user_id', fixture.id);
  if (members.error || !Array.isArray(members.data)) stop('membership_readback_failed');
  if (!expectedOrg) {
    if (members.data.length !== 0) stop('unscoped_fixture_has_membership');
    return [];
  }
  const m = members.data[0];
  if (members.data.length !== 1 || m.organization_id !== expectedOrg || m.user_id !== fixture.id || m.status !== 'active' || m.role !== 'owner') stop('fixture_membership_mismatch');
  const settings = await admin.from('organization_security_settings').select('organization_id,require_mfa_for_all_users').eq('organization_id', expectedOrg).single();
  if (settings.error || settings.data?.organization_id !== expectedOrg || typeof settings.data.require_mfa_for_all_users !== 'boolean') stop('fixture_policy_readback_failed');
  return [settings.data];
}
try {
  sourceSha = execFileSync('git', ['rev-parse','HEAD'], { encoding:'utf8', stdio:['ignore','pipe','ignore'] }).trim();
  if (!/^[0-9a-f]{40}$/.test(sourceSha) || env.SEC01_EXPECTED_MAIN_SHA !== sourceSha
    || env.GITHUB_ACTIONS !== 'true' || env.GITHUB_REF_NAME !== 'main' || env.GITHUB_REPOSITORY !== repo
    || env.SEC01_V2_BOOTSTRAP_EXECUTE !== 'QA_ONLY_V2_BOOTSTRAP_RPC_PROOF'
    || env.STEP_UP_QA_PROJECT_REF !== qaRef || env.NEXT_PUBLIC_SUPABASE_URL !== qaUrl
    || env.E2E_QA_MAIL_SINK_CONFIRMED !== 'true' || env.VERCEL_ENV === 'production'
    || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY
    || env.NEXT_PUBLIC_SUPABASE_ANON_KEY === env.SUPABASE_SERVICE_ROLE_KEY
    || !['.env','.env.local','.env.development','.env.development.local'].every(absentFile)
    || ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','RESEND_API_KEY','SMTP_HOST','SMTP_PASSWORD','SMTP_URL','SENDGRID_API_KEY','MAILGUN_API_KEY','VERCEL_TOKEN'].some(k => env[k])) stop('qa_context_refused');
  // The original MFA generator loads .env.local; only import after proving absence.
  const { generateTotpCode } = await import('../security/run-step-up-mfa-runtime-validation.mjs');
  const publicKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Reject accidentally swapped legacy or modern service keys BEFORE creating fixtures.
  const parts = publicKey.split('.');
  if (parts.length === 3 ? JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8')).role !== 'anon'
    : !publicKey.startsWith('sb_publishable_')) stop('publishable_key_refused');
  checks.isolatedContext = true;
  admin = client(env.SUPABASE_SERVICE_ROLE_KEY);
  baseline = await readBaseline();
  if (baseline.organizations !== 2 || baseline.enterprise_entitlement_sources !== 0
    || baseline.enterprise_entitlement_snapshots !== 0 || baseline.subscriptions !== 0
    || baseline.stripe_events_processed !== 0) stop('unexpected_qa_fixture_baseline');
  // Existing synthetic fixture helper only: its legacy compatibility envelope
  // is not commercial authority. No entitlement sources/snapshots or Stripe writes.
  failure = 'fixture_setup_failed';
  fixtures = await createEphemeralAuthFixtures(admin, { purpose:'qa-v2-bootstrap' });
  unscoped = await createEphemeralMfaUser(admin, { purpose:'qa-v2-bootstrap-unscoped' });
  if (fixtures.organizationA.id === fixtures.organizationB.id) stop('fixture_tenants_not_distinct');
  const own = await readPolicies(fixtures.owner, fixtures.organizationA.id);
  const other = await readPolicies(fixtures.outsider, fixtures.organizationB.id);
  const empty = await readPolicies(unscoped, null);
  checks.fixtureScopeReadback = true;
  const common = { qaUrl, publishableKey: publicKey };
  failure = 'anonymous_denial_failed';
  checks.anonymousDenied = await probeAnonymousBootstrapDenied(common);
  failure = 'signed_bootstrap_failed';
  const a = await login(fixtures.owner, publicKey);
  const b = await login(fixtures.outsider, publicKey);
  const c = await login(unscoped, publicKey);
  const probe = (session, fixture, aal, expectedPolicies) => probeSignedBootstrap({
    ...common, auth: session.supabase.auth, token: session.token, expectedUserId: fixture.id, expectedAal: aal, expectedPolicies,
  });
  checks.ownAal1 = await probe(a, fixtures.owner, 'aal1', own);
  checks.secondTenantAal1 = await probe(b, fixtures.outsider, 'aal1', other);
  checks.noMembershipAal1 = await probe(c, unscoped, 'aal1', empty);
  failure = 'aal2_bootstrap_failed';
  const enrolled = await a.supabase.auth.mfa.enroll({ factorType:'totp', friendlyName:'qa-v2-bootstrap' });
  if (enrolled.error || !enrolled.data?.id || !enrolled.data?.totp?.secret) stop('totp_enrollment_failed');
  const factorId = enrolled.data.id;
  const challenge = await a.supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data?.id) stop('totp_challenge_failed');
  const verified = await a.supabase.auth.mfa.verify({ factorId, challengeId:challenge.data.id, code:generateTotpCode(enrolled.data.totp.secret) });
  if (verified.error) stop('totp_verification_failed');
  const session = await a.supabase.auth.getSession();
  if (session.error || !session.data?.session?.access_token) stop('aal2_session_failed');
  a.token = session.data.session.access_token;
  checks.ownAal2 = await probe(a, fixtures.owner, 'aal2', own);
  checks.invalidSignatureDenied = await probeInvalidBootstrapSignatureDenied({ ...common, token:a.token });
  const claims = await a.supabase.auth.getClaims(a.token);
  const expiresAt = claims.data?.claims?.exp;
  const logout = await a.supabase.auth.signOut({ scope:'global' });
  clients.find(x => x.supabase === a.supabase).signedOut = !logout.error;
  checks.revokedSessionDenied = await probeRevokedBootstrapDenied({
    ...common, token:a.token, priorSignedProof:checks.ownAal2,
    signOutSucceeded:!logout.error, expiresAt,
  });
  failure = 'rpc_assertion_failed';
  if (Object.entries(checks).filter(([k])=>k!=='cleanupVerified').every(([,v])=>v)) failure = null;
} catch {
  // Deliberately redact exception details. Only fixed stage codes retained.
} finally {
  let revoked = true;
  for (const entry of clients) {
    if (entry.signedOut) continue;
    try { const r = await entry.supabase.auth.signOut({ scope:'global' }); revoked &&= !r.error; } catch { revoked = false; }
  }
  let scopedClean = false, emptyClean = false;
  if (admin && fixtures?.created) {
    try { scopedClean = (await cleanupEphemeralAuthFixtures(admin, fixtures.created)).verified === true; } catch { scopedClean = false; }
  }
  if (admin && unscoped?.id) {
    try {
      await cleanupEphemeralMfaUser(admin, unscoped.id);
      const lookup = await admin.auth.admin.getUserById(unscoped.id);
      emptyClean = lookup.error ? Number(lookup.error.status) === 404 : !lookup.data?.user;
    } catch { emptyClean = false; }
  }
  let baselineRestored = false;
  if (admin && baseline && scopedClean && emptyClean) {
    try { baselineRestored = JSON.stringify(await readBaseline()) === JSON.stringify(baseline); } catch { baselineRestored = false; }
  }
  checks.cleanupVerified = revoked && scopedClean && emptyClean && baselineRestored;
  const pass = failure === null && Object.values(checks).every(Boolean);
  const evidence = { schema:'qa-v2-bootstrap-rpc-v1', qaRef, sourceSha, outcome:pass?'QA_V2_BOOTSTRAP_RPC_PASS':'NOT_VERIFIED',
    checks, verifiedCount:Object.values(checks).filter(Boolean).length, requiredCount:Object.keys(checks).length,
    failure:pass?null:failure||'fixture_cleanup_failed', evidenceClass:'BOOTSTRAP_ONLY_NOT_PRIVATE_GUARD_QUOTA_OR_APP_RUNTIME',
    gate:'NOT_ACCEPTED', control:'NOT_VERIFIED', tokensRetained:false, identitiesRetained:false, secretsRetained:false };
  mkdirSync('artifacts/enterprise-sec01',{recursive:true});
  writeFileSync(output, JSON.stringify(evidence,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify(evidence));
  if (!pass) process.exitCode=1;
}
