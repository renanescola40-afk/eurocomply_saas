#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const path = 'docs/security/evidence/runtime/identity-access-lifecycle-validation.json';
const failures = [];
if (!existsSync(path)) failures.push('identity evidence is missing');
let evidence = null;
try { if (existsSync(path)) evidence = JSON.parse(readFileSync(path, 'utf8')); }
catch { failures.push('identity evidence is invalid JSON'); }

const requiredChecks = [
  'protectedMainExecution','exactShaBound','explicitConfirmation','signupValidated','loginValidated',
  'sessionRefreshValidated','accountRecoveryAccepted','logoutValidated','sessionRevocationValidated',
  'oauthCallbackFailsClosed','oidcDiscoveryValidated','adminMfaPolicyPresent','sensitiveStepUpPolicyPresent',
  'organizationOnboardingProofPresent','disposableUserCleanup',
];

if (evidence) {
  if (evidence.schema !== 'risck-comply.identity-access-lifecycle-evidence.v1') failures.push('identity schema is invalid');
  if (evidence.status !== 'Complete' || evidence.outcome !== 'passed') failures.push('identity evidence must be Complete/passed');
  if (!/^[a-f0-9]{40}$/i.test(String(evidence.targetSha ?? ''))) failures.push('identity evidence is not exact-SHA bound');
  for (const check of requiredChecks) if (evidence.checks?.[check] !== true) failures.push(`identity check ${check} must pass`);
  if (!Array.isArray(evidence.failures) || evidence.failures.length) failures.push('identity evidence contains failures');
  for (const field of ['credentialsStored','emailStored','tokensStored','providerResponsesStored']) {
    if (evidence.evidenceIntegrity?.[field] !== false) failures.push(`identity evidence integrity ${field} is unsafe`);
  }
  if (evidence.evidenceIntegrity?.disposableAccountRemoved !== true) failures.push('disposable identity was not removed');
}

if (failures.length) {
  console.error('Identity lifecycle evidence validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Identity lifecycle evidence validation passed.');
