import { readFileSync } from 'node:fs';

const file = process.argv[2] || 'docs/security/evidence/runtime/auth-rbac-final-validation.json';
const evidence = JSON.parse(readFileSync(file, 'utf8'));
const failures = [];
const fullSha = /^[0-9a-f]{40}$/;

function require(condition, message) {
  if (!condition) failures.push(message);
}

require(evidence.schema === 'risck-comply.auth-rbac-runtime-evidence.v1', 'unexpected schema');
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

if (evidence.status === 'Complete') {
  require(evidence.outcome === 'passed', 'Complete evidence must pass');
  require(evidence.repository === 'renanescola40-afk/eurocomply_saas', 'repository provenance is invalid');
  require(evidence.branch === 'main', 'Complete evidence must target main');
  require(fullSha.test(String(evidence.targetSha ?? '')), 'targetSha must be full SHA');
  require(evidence.targetSha === evidence.checkedOutSha, 'target and checked-out SHA must match');
  require(evidence.provenance?.githubActions === true, 'GitHub Actions provenance is required');
  require(/^\d+$/.test(String(evidence.provenance?.runId ?? '')), 'numeric workflow run ID is required');
  require(evidence.provenance?.exactShaBound === true, 'exact SHA binding is required');
  require(Object.values(evidence.checks ?? {}).every(Boolean), 'all runtime checks must pass');
  require(Array.isArray(evidence.controlsVerified) && evidence.controlsVerified.length >= 5, 'verified controls are missing');
  require(Array.isArray(evidence.failures) && evidence.failures.length === 0, 'Complete evidence cannot contain failures');
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
