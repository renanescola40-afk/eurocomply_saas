import { readFileSync } from 'node:fs';

const file = process.argv[2] || 'docs/security/evidence/runtime/auth-rbac-final-validation.json';
const evidence = JSON.parse(readFileSync(file, 'utf8'));
const failures = [];
const fullSha = /^[0-9a-f]{40}$/;

function require(condition, message) {
  if (!condition) failures.push(message);
}

function validateIdentityJourney(journey) {
  require(journey && typeof journey === 'object' && !Array.isArray(journey), 'identity journey must be an object');
  if (!journey || typeof journey !== 'object' || Array.isArray(journey)) return;

  require(journey.schema === 'risck-comply.auth-identity-journey.v1', 'identity journey schema is invalid');
  require(['Open', 'Complete'].includes(journey.status), 'identity journey status is invalid');
  require(['blocked', 'failed', 'passed'].includes(journey.outcome), 'identity journey outcome is invalid');
  require(journey.checks && typeof journey.checks === 'object' && !Array.isArray(journey.checks), 'identity journey checks are invalid');
  require(Object.values(journey.checks ?? {}).length >= 8, 'identity journey checks are incomplete');
  require(Object.values(journey.checks ?? {}).every((value) => typeof value === 'boolean'), 'identity journey checks must be boolean');
  require(Array.isArray(journey.failures), 'identity journey failures must be an array');
  require(typeof journey.cleanupVerified === 'boolean', 'identity journey cleanup result is missing');
  require(journey.evidenceIntegrity?.containsSensitiveValues === false, 'identity journey cannot contain sensitive values');
  require(journey.evidenceIntegrity?.rawCredentialsStored === false, 'identity journey cannot store credentials');
  require(journey.evidenceIntegrity?.accessTokensStored === false, 'identity journey cannot store access tokens');
  require(journey.evidenceIntegrity?.userIdentifiersStored === false, 'identity journey cannot store user identifiers');
  require(journey.evidenceIntegrity?.organizationIdentifiersStored === false, 'identity journey cannot store organization identifiers');
  require(journey.evidenceIntegrity?.rawProviderResponsesStored === false, 'identity journey cannot store raw provider responses');
  require(journey.evidenceIntegrity?.cleanupRequired === true, 'identity journey cleanup must be mandatory');

  if (journey.status === 'Complete') {
    require(journey.outcome === 'passed', 'Complete identity journey must pass');
    require(Object.values(journey.checks ?? {}).every((value) => value === true), 'Complete identity journey requires every check');
    require(journey.cleanupVerified === true, 'Complete identity journey cleanup must be verified');
    require(journey.failures.length === 0, 'Complete identity journey cannot contain failures');
  } else {
    require(journey.outcome !== 'passed', 'Open identity journey cannot report passed outcome');
  }
}

require(['risck-comply.auth-rbac-runtime-evidence.v1', 'risck-comply.auth-rbac-runtime-evidence.v2'].includes(evidence.schema), 'unexpected schema');
require(evidence.evidenceItem === 'auth-rbac-final-validation', 'unexpected evidenceItem');
require(['Open', 'Complete'].includes(evidence.status), 'unsupported status');
require(['blocked', 'failed', 'passed'].includes(evidence.outcome), 'unsupported outcome');
require(typeof evidence.summary === 'string' && evidence.summary.length >= 40, 'summary is missing');
require(evidence.redactionConfirmation === 'Redaction confirmed for runtime evidence.', 'redaction confirmation is missing');
require(Array.isArray(evidence.evidenceLocations) && evidence.evidenceLocations.length >= 1, 'evidence locations are missing');
require(evidence.evidenceIntegrity?.runtimeProofInvented === false, 'runtime proof integrity flag is invalid');
require(evidence.evidenceIntegrity?.rawCredentialsStored === false, 'credentials must not be stored');
require(evidence.evidenceIntegrity?.accessTokensStored === false, 'tokens must not be stored');
require(evidence.evidenceIntegrity?.userIdentifiersStored === false, 'user identifiers must not be stored');
require(evidence.evidenceIntegrity?.organizationIdentifiersStored === false, 'organization identifiers must not be stored');

if (evidence.schema === 'risck-comply.auth-rbac-runtime-evidence.v2') {
  require(evidence.evidenceIntegrity?.serviceRoleKeyStored === false, 'service role key must not be stored');
  require(evidence.evidenceIntegrity?.disposablePasswordStored === false, 'disposable password must not be stored');
  require(evidence.evidenceIntegrity?.cleanupRequired === true, 'core disposable cleanup must be mandatory');
  require(evidence.evidenceIntegrity?.identityJourneyCredentialsStored === false || evidence.identityJourney === undefined, 'identity journey credentials must not be stored');
  require(evidence.evidenceIntegrity?.identityJourneyIdentifiersStored === false || evidence.identityJourney === undefined, 'identity journey identifiers must not be stored');
  require(evidence.evidenceIntegrity?.identityJourneyCleanupRequired === true || evidence.identityJourney === undefined, 'identity journey cleanup must be mandatory');
  if (evidence.identityJourney !== undefined) validateIdentityJourney(evidence.identityJourney);
}

if (evidence.status === 'Complete') {
  require(evidence.outcome === 'passed', 'Complete evidence must pass');
  require(evidence.repository === 'renanescola40-afk/eurocomply_saas', 'repository provenance is invalid');
  require(evidence.branch === 'main', 'Complete evidence must target main');
  require(fullSha.test(String(evidence.targetSha ?? '')), 'targetSha must be full SHA');
  require(evidence.targetSha === evidence.checkedOutSha, 'target and checked-out SHA must match');
  require(evidence.provenance?.githubActions === true, 'GitHub Actions provenance is required');
  require(/^\d+$/.test(String(evidence.provenance?.runId ?? '')), 'numeric workflow run ID is required');
  require(evidence.provenance?.exactShaBound === true, 'exact SHA binding is required');
  require(Object.values(evidence.checks ?? {}).every(Boolean), 'all core runtime checks must pass');
  require(Array.isArray(evidence.controlsVerified) && evidence.controlsVerified.length >= 5, 'verified core controls are missing');
  require(Array.isArray(evidence.failures) && evidence.failures.length === 0, 'Complete core evidence cannot contain failures');
  if (evidence.schema === 'risck-comply.auth-rbac-runtime-evidence.v2') {
    require(evidence.evidenceIntegrity?.cleanupVerified === true, 'core disposable fixture cleanup must be verified');
  }
} else {
  require(String(evidence.productionGate ?? '').toLowerCase().includes('blocked'), 'Open evidence must block production');
  require(Array.isArray(evidence.controlsVerified) && evidence.controlsVerified.length === 0, 'Open evidence cannot claim verified controls');
}

if (failures.length) {
  console.error('Auth/RBAC runtime evidence validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Validated Auth/RBAC runtime evidence: ${evidence.status}/${evidence.outcome}`);
