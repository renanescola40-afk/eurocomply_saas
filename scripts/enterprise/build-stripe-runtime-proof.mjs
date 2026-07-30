#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const [catalogPath, outputDir = 'artifacts/stripe-runtime-proof'] = process.argv.slice(2);
if (!catalogPath) throw new Error('Usage: build-stripe-runtime-proof.mjs <catalog.txt> [output-dir]');

const releaseSha = process.env.RELEASE_SHA ?? 'unknown';
const targetEnvironment = process.env.TARGET_ENVIRONMENT ?? 'unknown';
const stripeEventId = process.env.STRIPE_EVENT_ID ?? '';
const organizationId = process.env.ORGANIZATION_ID ?? '';
const expectedPlanCode = process.env.EXPECTED_PLAN_CODE ?? '';
const expectedFull = Number(process.env.EXPECTED_FULL_SEAT_LIMIT ?? 'NaN');
const expectedParticipant = Number(process.env.EXPECTED_PARTICIPANT_SEAT_LIMIT ?? 'NaN');
const expectedViewer = Number(process.env.EXPECTED_VIEWER_SEAT_LIMIT ?? 'NaN');
const stripeTestModeConfirmed = process.env.STRIPE_TEST_MODE_CONFIRMED === 'true';

if (!/^evt_[A-Za-z0-9_]+$/.test(stripeEventId)) throw new Error('Invalid Stripe event id');
if (!/^[0-9a-f-]{36}$/i.test(organizationId)) throw new Error('Invalid organization id');
if (![expectedFull, expectedParticipant, expectedViewer].every(Number.isSafeInteger)) {
  throw new Error('Expected seat limits must be integers');
}

const raw = readFileSync(catalogPath, 'utf8').trim();
const rows = raw.split(/\r?\n/).filter(Boolean).map((line) => line.split('|'));
const event = rows.find(([kind]) => kind === 'event');
const snapshot = rows.find(([kind]) => kind === 'snapshot');
const policy = rows.find(([kind]) => kind === 'policy');
const reconciliation = rows.find(([kind]) => kind === 'reconciliation_event');

const checks = {
  exactReleaseSha: /^[0-9a-f]{40}$/i.test(releaseSha),
  stripeTestModeConfirmed,
  processedEvent: event?.[2] === 'processed',
  eventTenantBound: event?.[3] === organizationId,
  snapshotPresent: Boolean(snapshot),
  snapshotTenantBound: snapshot?.[2] === organizationId,
  planMatches: snapshot?.[3] === expectedPlanCode,
  snapshotLimitsMatch:
    Number(snapshot?.[4]) === expectedFull &&
    Number(snapshot?.[5]) === expectedParticipant &&
    Number(snapshot?.[6]) === expectedViewer,
  policyPresent: Boolean(policy),
  policyTenantBound: policy?.[1] === organizationId,
  policyLimitsMatch:
    Number(policy?.[2]) === expectedFull &&
    Number(policy?.[3]) === expectedParticipant &&
    Number(policy?.[4]) === expectedViewer,
  reconciliationEvidencePresent: Boolean(reconciliation),
  reconciliationApplied: ['applied', 'idempotent_replay'].includes(reconciliation?.[2] ?? ''),
};

const runtimePassed = Object.values(checks).every(Boolean);
const generatedAt = new Date().toISOString();
const catalogSha256 = createHash('sha256').update(raw).digest('hex');
const failedChecks = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);

const promotionChecks = {
  eventProcessed: checks.processedEvent && checks.eventTenantBound,
  snapshotObserved: checks.snapshotPresent && checks.snapshotTenantBound,
  policyObserved: checks.policyPresent && checks.policyTenantBound,
  limitsMatch: checks.planMatches && checks.snapshotLimitsMatch && checks.policyLimitsMatch,
  reconciliationObserved: checks.reconciliationEvidencePresent && checks.reconciliationApplied,
  rawEvidenceDeleted: false,
  replaySafe: false,
};

const proof = {
  id: 'stripe-entitlement-runtime-proof',
  status: runtimePassed ? 'PendingCleanup' : 'Open',
  validationStatus: runtimePassed ? 'runtime_observed' : 'runtime_proof_failed',
  releaseSha,
  targetEnvironment,
  generatedAt,
  stripe: {
    eventIdSuffix: stripeEventId.slice(-8),
    eventTypeDisclosed: false,
    testModeConfirmedExternally: stripeTestModeConfirmed,
  },
  organization: { idSuffix: organizationId.slice(-8) },
  expected: {
    planCode: expectedPlanCode,
    seatLimits: { full: expectedFull, participant: expectedParticipant, viewer: expectedViewer },
  },
  checks,
  failedChecks,
  evidenceIntegrity: {
    catalogSha256,
    containsSecrets: false,
    containsCustomerRows: false,
    queryMode: 'read_only_transaction',
    rawCatalogDeleted: false,
  },
  truthBoundary: {
    provesSingleObservedEvent: runtimePassed,
    provesAllFutureStripeEvents: false,
    provesProductionLoadCapacity: false,
    provesSignedContractAuthority: false,
    provesReplaySafety: false,
  },
};

const evidence = {
  evidenceItem: 'stripe-billing-validation',
  status: runtimePassed ? 'PendingCleanup' : 'Open',
  validationStatus: runtimePassed ? 'pending_cleanup' : 'failed',
  outcome: runtimePassed ? 'pending_cleanup' : 'failed',
  repository: process.env.GITHUB_REPOSITORY ?? 'renanescola40-afk/eurocomply_saas',
  branch: 'main',
  commitSha: releaseSha,
  releaseSha,
  generatedAt,
  environment: targetEnvironment,
  stripeTestModeConfirmed,
  containsSensitiveValues: false,
  catalogSha256,
  checks: promotionChecks,
  failedChecks,
  runtimeProof: {
    executed: true,
    headSha: releaseSha,
    runId: process.env.GITHUB_RUN_ID ?? '',
    artifactDigest: `sha256:${catalogSha256}`,
    eventIdSuffix: stripeEventId.slice(-8),
    organizationIdSuffix: organizationId.slice(-8),
  },
  expected: proof.expected,
  truthBoundary: proof.truthBoundary,
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(`${outputDir}/proof.json`, `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(`${outputDir}/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
writeFileSync(`${outputDir}/summary.md`, [
  '# Stripe entitlement runtime proof',
  '',
  `- Status: **${proof.status}**`,
  `- Release SHA: \`${releaseSha}\``,
  `- Environment: \`${targetEnvironment}\``,
  `- Event suffix: \`${proof.stripe.eventIdSuffix}\``,
  `- Organisation suffix: \`${proof.organization.idSuffix}\``,
  `- Catalog SHA-256: \`${catalogSha256}\``,
  '',
  ...Object.entries(checks).map(([name, ok]) => `- ${ok ? 'PASS' : 'FAIL'} — ${name}`),
  '',
  runtimePassed
    ? 'Runtime correlation passed. Raw-catalog cleanup must still complete before the artifact is final.'
    : `Runtime correlation failed: ${failedChecks.join(', ') || 'unknown check'}.`,
  '',
  'This artifact proves only the specifically observed event and exact release SHA.',
].join('\n'));

console.log(JSON.stringify({
  status: proof.status,
  validationStatus: proof.validationStatus,
  checks,
  failedChecks,
  outputFiles: ['proof.json', 'evidence.json', 'summary.md'],
}, null, 2));

if (!runtimePassed) process.exitCode = 1;
