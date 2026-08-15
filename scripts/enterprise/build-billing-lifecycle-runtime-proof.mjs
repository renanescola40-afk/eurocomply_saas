#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const rawPath = process.argv[2] ?? 'artifacts/billing-lifecycle-runtime-proof/raw.json';
const evidencePath = process.argv[3] ?? 'artifacts/billing-lifecycle-runtime-proof/evidence.json';
const summaryPath = process.argv[4] ?? 'artifacts/billing-lifecycle-runtime-proof/summary.md';
const env = (name) => String(process.env[name] ?? '').trim();

const baseChecks = [
  'runtimeReleaseShaVerified',
  'schemaReady',
  'subscriptionObserved',
  'subscriptionActive',
  'subscriptionCustomerBound',
  'stripeEventProcessed',
  'stripeEventAuthoritativeType',
  'stripeEventBindingMatches',
  'allLifecycleActionsPresent',
  'allLifecycleRequestsCompleted',
  'requestFingerprintsValid',
  'resultSnapshotsBound',
  'upgradeObserved',
  'downgradeObserved',
  'cancelObserved',
  'reactivateObserved',
  'cancelPrecedesReactivate',
  'allLifecycleAuditsPresent',
  'downgradeScheduledForPeriodEnd',
  'cancelAuditMatches',
  'reactivateAuditMatches',
  'auditHashesPresent',
  'auditPredecessorLinksResolve',
  'auditChainCryptographicallyVerified',
];

const failures = [];
let rawBytes = Buffer.alloc(0);
let observed = {};
try {
  rawBytes = readFileSync(rawPath);
  observed = JSON.parse(rawBytes.toString('utf8').trim());
} catch {
  failures.push('raw_runtime_observation_invalid');
}

const releaseSha = env('RELEASE_SHA').toLowerCase();
const repository = env('REPOSITORY');
const targetEnvironment = env('TARGET_ENVIRONMENT').toLowerCase();
const organizationId = env('ORGANIZATION_ID');
const stripeSubscriptionId = env('STRIPE_SUBSCRIPTION_ID');
const stripeEventId = env('STRIPE_EVENT_ID');

if (!/^[0-9a-f]{40}$/.test(releaseSha)) failures.push('release_sha_invalid');
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) failures.push('repository_invalid');
if (!['staging', 'production'].includes(targetEnvironment)) failures.push('target_environment_invalid');
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)) failures.push('organization_id_invalid');
if (!/^sub_[A-Za-z0-9]+$/.test(stripeSubscriptionId)) failures.push('stripe_subscription_id_invalid');
if (!/^evt_[A-Za-z0-9]+$/.test(stripeEventId)) failures.push('stripe_event_id_invalid');

const externallyVerifiedChecks = {
  runtimeReleaseShaVerified: env('RUNTIME_RELEASE_SHA_VERIFIED') === 'true',
  auditChainCryptographicallyVerified: env('AUDIT_CHAIN_CRYPTOGRAPHICALLY_VERIFIED') === 'true',
};
const observedChecks = Object.fromEntries(
  baseChecks
    .filter((name) => !(name in externallyVerifiedChecks))
    .map((name) => [name, observed?.[name] === true]),
);
const allCheckNames = [...baseChecks, 'stripeEventLiveMode', 'productionLiveAuthorityRequired'];
const checks = Object.fromEntries(allCheckNames.map((name) => [
  name,
  name in externallyVerifiedChecks
    ? externallyVerifiedChecks[name]
    : (name in observedChecks ? observedChecks[name] : observed?.[name] === true),
]));
const requiredChecks = targetEnvironment === 'production'
  ? [...baseChecks, 'stripeEventLiveMode', 'productionLiveAuthorityRequired']
  : baseChecks;

for (const check of requiredChecks) {
  if (checks[check] !== true) failures.push(`check_failed:${check}`);
}

const passed = failures.length === 0;
const suffix = (value, length) => value ? value.slice(-length) : null;
const sourceSha256 = createHash('sha256').update(rawBytes).digest('hex');
const liveAuthorityRequired = targetEnvironment === 'production';

const evidence = {
  schema: 'risck-comply.billing-lifecycle-runtime-evidence.v1',
  evidenceItem: 'billing-lifecycle-runtime-proof',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  repository,
  releaseSha,
  workflowRunId: env('GITHUB_RUN_ID') || null,
  targetEnvironment,
  correlation: {
    organizationIdSuffix: suffix(organizationId, 8),
    stripeSubscriptionIdSuffix: suffix(stripeSubscriptionId, 10),
    stripeEventIdSuffix: suffix(stripeEventId, 12),
    rawIdentifiersStored: false,
  },
  authorityPolicy: {
    productionRequiresLiveStripeAuthority: true,
    liveStripeAuthorityRequired: liveAuthorityRequired,
    exactDeployedRuntimeShaRequired: true,
    canonicalAuditHashChainVerificationRequired: true,
    evidenceIsReadOnlyObservation: true,
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
    providerPayloadStored: false,
    rawAuditEventsStored: false,
    auditVerifierOutputStored: false,
  },
  boundary: 'Read-only observation of one pre-authorized organization and one Stripe subscription, bound to the exact SHA independently reported by the target runtime. Completion proves correlated persisted lifecycle evidence for upgrade, scheduled downgrade, cancellation and later reactivation plus canonical audit hash-chain verification; it does not execute a charge, mutate Stripe, prove every tenant, or guarantee future provider availability.',
};

const summary = [
  '# Billing lifecycle runtime proof',
  '',
  `- Status: **${evidence.status}**`,
  `- Outcome: **${evidence.outcome}**`,
  `- Release SHA: \`${releaseSha || 'missing'}\``,
  `- Environment: \`${targetEnvironment || 'missing'}\``,
  `- Production live authority required: **${liveAuthorityRequired ? 'yes' : 'no'}**`,
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

console.log(JSON.stringify({ status: evidence.status, outcome: evidence.outcome, failures: evidence.failures }, null, 2));