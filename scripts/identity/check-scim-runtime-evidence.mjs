#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const path = process.env.SCIM_RUNTIME_OUTPUT || 'artifacts/scim-runtime-proof/scim-runtime-validation.json';
const expectedSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
const failures = [];
let evidence = null;

if (!existsSync(path)) failures.push('SCIM runtime evidence is missing');
try {
  if (existsSync(path)) evidence = JSON.parse(readFileSync(path, 'utf8'));
} catch {
  failures.push('SCIM runtime evidence is invalid JSON');
}

const requiredChecks = [
  'protectedMainExecution',
  'exactShaBound',
  'explicitConfirmation',
  'httpsTarget',
  'serviceProviderConfigValidated',
  'resourceTypesValidated',
  'schemasValidated',
  'unauthorizedDenied',
  'userCreated',
  'userFilterValidated',
  'userRead',
  'userPatched',
  'userDeactivated',
  'userReactivated',
  'groupCreated',
  'groupFilterValidated',
  'groupRead',
  'groupPatched',
  'groupMembershipValidated',
  'groupDeleted',
  'deletedGroupDenied',
  'userDeprovisioned',
  'deprovisionedUserInactive',
  'noStoreResponses',
  'scimContentType',
  'cleanupComplete',
];

if (evidence) {
  if (evidence.schema !== 'risck-comply.scim-runtime-evidence.v1') failures.push('SCIM evidence schema is invalid');
  if (evidence.evidenceItem !== 'scim-users-groups-runtime-validation') failures.push('SCIM evidence item is invalid');
  if (evidence.status !== 'Complete' || evidence.outcome !== 'passed') failures.push('SCIM evidence must be Complete/passed');
  if (!/^[a-f0-9]{40}$/.test(String(evidence.targetSha ?? ''))) failures.push('SCIM target SHA is invalid');
  if (evidence.observedSha !== evidence.targetSha) failures.push('SCIM observed SHA does not match target SHA');
  if (expectedSha && evidence.targetSha !== expectedSha) failures.push('SCIM evidence does not match the requested SHA');
  if (!evidence.repository || !evidence.runId) failures.push('SCIM repository/run provenance is missing');
  if (JSON.stringify(evidence.controlsVerified) !== JSON.stringify(['IAM-09'])) failures.push('SCIM control mapping is invalid');
  for (const check of requiredChecks) if (evidence.checks?.[check] !== true) failures.push(`SCIM check ${check} must pass`);
  if (!Array.isArray(evidence.failures) || evidence.failures.length !== 0) failures.push('SCIM evidence contains failures');

  const integrity = evidence.evidenceIntegrity ?? {};
  for (const field of [
    'containsSensitiveValues',
    'bearerTokenStored',
    'emailStored',
    'externalIdentifiersStored',
    'resourceIdentifiersStored',
    'providerResponsesStored',
    'networkHeadersStored',
  ]) {
    if (integrity[field] !== false) failures.push(`SCIM evidence integrity field ${field} is unsafe`);
  }
  if (integrity.inactiveIdentityRetainedForAudit !== true) failures.push('SCIM deprovisioning audit boundary is missing');

  const serialized = JSON.stringify(evidence).toLowerCase();
  for (const forbidden of [
    'authorization',
    'bearer ',
    'access_token',
    'refresh_token',
    'username',
    '@',
    'proof-user-',
    'proof-group-',
  ]) {
    if (serialized.includes(forbidden)) failures.push(`SCIM evidence contains forbidden value: ${forbidden}`);
  }
}

if (failures.length > 0) {
  console.error('SCIM runtime evidence validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('SCIM runtime evidence validation passed.');
