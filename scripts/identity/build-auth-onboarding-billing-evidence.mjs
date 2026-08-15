#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const rawPath = process.argv[2] ?? 'artifacts/auth-onboarding-billing-runtime-proof/raw.json';
const evidencePath = process.argv[3] ?? 'artifacts/auth-onboarding-billing-runtime-proof/evidence.json';
const summaryPath = process.argv[4] ?? 'artifacts/auth-onboarding-billing-runtime-proof/summary.md';
const env = (name) => String(process.env[name] ?? '').trim();

const baseRequiredChecks = [
  'schemaReady',
  'organizationObserved',
  'organizationOnboardingCompleted',
  'organizationPlanMatches',
  'activationRunObserved',
  'activationPlanMatches',
  'subscriptionObserved',
  'subscriptionActive',
  'subscriptionPlanMatches',
  'stripeBindingPresent',
  'entitlementsPresent',
  'stripeEventProcessed',
  'stripeEventAuthoritativeType',
  'stripeEventBindingMatches',
  'webhookAuditObserved',
  'subscriptionUpdatedAuditObserved',
  'subscriptionSyncedAuditObserved',
  'auditHashesPresent',
  'auditPredecessorLinksResolve',
];
const productionRequiredChecks = [
  'stripeEventLiveMode',
  'productionLiveAuthorityRequired',
];
const allChecks = [...baseRequiredChecks, ...productionRequiredChecks];

const failures = [];
let rawBytes = Buffer.alloc(0);
let observed = {};

try {
  rawBytes = readFileSync(rawPath);
  const text = rawBytes.toString('utf8').trim();
  observed = JSON.parse(text);
} catch {
  failures.push('raw_runtime_observation_invalid');
}

const releaseSha = env('RELEASE_SHA');
const repository = env('REPOSITORY');
const targetEnvironment = env('TARGET_ENVIRONMENT');
const organizationId = env('ORGANIZATION_ID');
const stripeEventId = env('STRIPE_EVENT_ID');
const expectedPlan = env('EXPECTED_PLAN').toLowerCase();

if (!/^[a-f0-9]{40}$/i.test(releaseSha)) failures.push('release_sha_invalid');
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) failures.push('repository_invalid');
if (!['staging', 'production'].includes(targetEnvironment)) failures.push('target_environment_invalid');
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)) failures.push('organization_id_invalid');
if (!/^evt_[A-Za-z0-9]+$/.test(stripeEventId)) failures.push('stripe_event_id_invalid');
if (!/^[a-z][a-z0-9_-]{1,119}$/.test(expectedPlan)) failures.push('expected_plan_invalid');

const checks = Object.fromEntries(allChecks.map((name) => [name, observed?.[name] === true]));
const requiredChecks = targetEnvironment === 'production'
  ? [...baseRequiredChecks, ...productionRequiredChecks]
  : baseRequiredChecks;
for (const name of requiredChecks) {
  if (checks[name] !== true) failures.push(`check_failed:${name}`);
}

const passed = failures.length === 0;
const sourceSha256 = createHash('sha256').update(rawBytes).digest('hex');
const suffix = (value, length = 8) => value ? value.slice(-length) : null;
const liveStripeAuthorityRequired = targetEnvironment === 'production';

const evidence = {
  schema: 'risck-comply.auth-onboarding-billing-runtime-evidence.v1',
  evidenceItem: 'auth-onboarding-billing-runtime-proof',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  repository,
  releaseSha,
  workflowRunId: env('GITHUB_RUN_ID') || null,
  targetEnvironment,
  expectedPlan,
  authorityPolicy: {
    productionRequiresLiveStripeAuthority: true,
    liveStripeAuthorityRequired,
    authoritativeSubscriptionEventTypes: [
      'customer.subscription.created',
      'customer.subscription.updated',
    ],
  },
  correlation: {
    organizationIdSuffix: suffix(organizationId),
    stripeEventIdSuffix: suffix(stripeEventId, 12),
    rawIdentifiersStored: false,
  },
  checks,
  failures: [...new Set(failures)].sort(),
  integrity: {
    sourceSha256,
    sourceByteLength: rawBytes.length,
    secretsStored: false,
    credentialsStored: false,
    connectionStringsStored: false,
    rawDatabaseRowsStored: false,
  },
  boundary: liveStripeAuthorityRequired
    ? 'Read-only exact-SHA observation of one pre-authorized production organization. Completion requires a processed live-mode Stripe subscription-created/updated event correlated to the exact organization, customer and subscription. The artifact stores booleans, bounded plan/status metadata, identifier suffixes and a source digest only; it does not prove every tenant, payment settlement, legal compliance or future deployment.'
    : 'Read-only exact-SHA observation of one pre-authorized staging organization. Event processing, authoritative subscription-event type and exact customer/subscription binding are required, but staging completion does not claim live-mode Stripe authority. The artifact stores booleans, bounded plan/status metadata, identifier suffixes and a source digest only.',
};

const summary = [
  '# Auth, onboarding and billing runtime proof',
  '',
  `- Status: **${evidence.status}**`,
  `- Outcome: **${evidence.outcome}**`,
  `- Release SHA: \`${releaseSha || 'missing'}\``,
  `- Environment: \`${targetEnvironment || 'missing'}\``,
  `- Expected plan: \`${expectedPlan || 'missing'}\``,
  `- Live Stripe authority required: **${liveStripeAuthorityRequired ? 'yes' : 'no'}**`,
  '',
  '## Controls',
  '',
  ...Object.entries(checks).map(([name, value]) => `- ${value ? 'PASS' : 'FAIL'} — ${name}`),
  '',
  '## Failures',
  '',
  ...(evidence.failures.length ? evidence.failures.map((failure) => `- ${failure}`) : ['- None']),
  '',
  '## Truth boundary',
  '',
  evidence.boundary,
  '',
].join('\n');

mkdirSync(dirname(evidencePath), { recursive: true });
mkdirSync(dirname(summaryPath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
writeFileSync(summaryPath, summary, { mode: 0o600 });

for (const [name, value] of Object.entries(checks)) {
  process.stdout.write(`${value ? 'PASS' : 'FAIL'} ${name}\n`);
}
process.stdout.write(`DECISION ${evidence.status}/${evidence.outcome}\n`);
