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

const passed = Object.values(checks).every(Boolean);
const generatedAt = new Date().toISOString();
const proof = {
  id: 'stripe-entitlement-runtime-proof',
  status: passed ? 'Complete' : 'Open',
  validationStatus: passed ? 'runtime_proof_passed' : 'runtime_proof_failed',
  releaseSha,
  targetEnvironment,
  generatedAt,
  stripe: {
    eventIdSuffix: stripeEventId.slice(-8),
    eventTypeDisclosed: false,
    testModeConfirmedExternally: process.env.STRIPE_TEST_MODE_CONFIRMED === 'true',
  },
  organization: { idSuffix: organizationId.slice(-8) },
  expected: {
    planCode: expectedPlanCode,
    seatLimits: { full: expectedFull, participant: expectedParticipant, viewer: expectedViewer },
  },
  checks,
  evidenceIntegrity: {
    catalogSha256: createHash('sha256').update(raw).digest('hex'),
    containsSecrets: false,
    containsCustomerRows: false,
    queryMode: 'read_only_transaction',
  },
  truthBoundary: {
    provesSingleObservedEvent: passed,
    provesAllFutureStripeEvents: false,
    provesProductionLoadCapacity: false,
    provesSignedContractAuthority: false,
  },
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(`${outputDir}/proof.json`, `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(`${outputDir}/summary.md`, [
  '# Stripe entitlement runtime proof',
  '',
  `- Status: **${proof.status}**`,
  `- Release SHA: \`${releaseSha}\``,
  `- Environment: \`${targetEnvironment}\``,
  `- Event suffix: \`${proof.stripe.eventIdSuffix}\``,
  `- Organisation suffix: \`${proof.organization.idSuffix}\``,
  `- Catalog SHA-256: \`${proof.evidenceIntegrity.catalogSha256}\``,
  '',
  ...Object.entries(checks).map(([name, ok]) => `- ${ok ? 'PASS' : 'FAIL'} — ${name}`),
  '',
  'This artifact proves only the specifically observed event and exact release SHA.',
].join('\n'));

if (!passed) process.exitCode = 1;
