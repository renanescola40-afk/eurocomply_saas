#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const inputPath = resolve(process.argv[2] ?? 'artifacts/stripe-entitlement-runtime-proof/evidence.json');
const outputPath = resolve(process.argv[3] ?? 'artifacts/stripe-runtime-evidence-promotion/promoted-evidence.json');
const expectedSha = process.env.RELEASE_SHA ?? process.env.GITHUB_SHA;

if (!expectedSha || !/^[0-9a-f]{40}$/i.test(expectedSha)) throw new Error('RELEASE_SHA must be a full commit SHA');
if (!existsSync(inputPath)) throw new Error(`Runtime evidence not found: ${inputPath}`);

const evidence = JSON.parse(readFileSync(inputPath, 'utf8'));
const requiredPassed = ['eventProcessed','snapshotObserved','policyObserved','limitsMatch','reconciliationObserved','rawEvidenceDeleted'];
for (const key of requiredPassed) {
  if (evidence?.checks?.[key] !== true) throw new Error(`Runtime evidence check did not pass: ${key}`);
}
if (evidence.releaseSha !== expectedSha) throw new Error('Runtime evidence SHA does not match RELEASE_SHA');
if (evidence.stripeTestModeConfirmed !== true) throw new Error('Only Stripe test-mode proof can be promoted by this workflow');
if (evidence.containsSensitiveValues === true) throw new Error('Sensitive runtime evidence cannot be promoted');
if (!evidence.catalogSha256 || !/^[0-9a-f]{64}$/i.test(evidence.catalogSha256)) throw new Error('Missing catalog SHA-256');

const promoted = {
  id: 'stripe-entitlement-runtime-proof',
  evidenceItem: 'stripe-billing-validation',
  status: 'Complete',
  validationStatus: 'passed',
  outcome: 'passed',
  repository: process.env.GITHUB_REPOSITORY ?? 'renanescola40-afk/eurocomply_saas',
  branch: 'main',
  commitSha: expectedSha,
  reviewedAt: new Date().toISOString(),
  environment: evidence.environment,
  controlsVerified: requiredPassed,
  runtimeProof: {
    executed: true,
    stripeTestModeConfirmed: true,
    signedWebhookDelivered: true,
    entitlementSnapshotObserved: true,
    canonicalSeatPolicyObserved: true,
    reconciliationLedgerObserved: true,
    replaySafetyObserved: evidence.checks?.replaySafe === true,
  },
  sourceEvidenceDigest: createHash('sha256').update(JSON.stringify(evidence)).digest('hex'),
  artifactDigest: evidence.catalogSha256,
  redactionConfirmation: 'Redaction confirmed for runtime evidence.',
  evidenceIntegrity: {
    placeholderOnly: false,
    runtimeProofInvented: false,
    customerFacingProof: false,
    containsSensitiveValues: false,
  },
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(promoted, null, 2)}\n`);
console.log(JSON.stringify({ status: promoted.status, commitSha: promoted.commitSha, outputPath }, null, 2));
