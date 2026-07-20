#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/security/evidence/runtime/platform-providers-validation.json';
const failures = [];
const requiredChecks = [
  'protectedMainExecution','exactShaBound','checkout','subscriptions','webhookSignature','webhookIdempotency',
  'invalidWebhookRejected','emailDelivery','sentryEventIngestion','sentryReleaseAndSourceMaps',
  'distributedRateLimit','stripeProviderReachable','providerFailureClassification',
];

if (!existsSync(path)) failures.push('platform evidence is missing');
let evidence = null;
try { evidence = JSON.parse(readFileSync(path, 'utf8')); } catch { failures.push('platform evidence is invalid JSON'); }

if (evidence) {
  if (evidence.schema !== 'risck-comply.platform-providers-validation.v1') failures.push('invalid schema');
  if (evidence.status !== 'Complete' || evidence.outcome !== 'passed') failures.push('evidence must be Complete/passed');
  if (!/^[a-f0-9]{40}$/i.test(String(evidence.targetSha ?? ''))) failures.push('target SHA is not exact');
  for (const check of requiredChecks) if (evidence.checks?.[check] !== true) failures.push(`check ${check} must pass`);
  if (!Array.isArray(evidence.failures) || evidence.failures.length !== 0) failures.push('evidence contains failures');
  for (const key of ['credentialsStored','responseBodiesStored','customerDataStored','providerUrlsStored']) {
    if (evidence.evidenceIntegrity?.[key] !== false) failures.push(`evidence integrity ${key} must be false`);
  }
}

if (failures.length) {
  console.error('Platform provider evidence validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Platform provider evidence validation passed.');
