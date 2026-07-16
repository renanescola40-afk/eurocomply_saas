#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const file = process.argv[2] || 'docs/security/evidence/runtime/auth-rbac-validation.json';
const evidence = JSON.parse(readFileSync(file, 'utf8'));
const failures = [];
const expectedChecks = [
  'signup',
  'login',
  'logout',
  'sessionRefresh',
  'oauthCallback',
  'rbac',
  'organizationOnboarding',
];

function require(condition, message) {
  if (!condition) failures.push(message);
}

require(evidence.schema === 'risck-comply.auth-rbac-scorecard-evidence.v1', 'unexpected schema');
require(evidence.evidenceItem === 'auth-rbac-validation', 'unexpected evidenceItem');
require(['Open', 'Complete'].includes(evidence.status), 'unsupported status');
require(['not_verified', 'partial', 'passed'].includes(evidence.outcome), 'unsupported outcome');
require(Array.isArray(evidence.checks), 'checks must be an array');
require(evidence.checks?.length === expectedChecks.length, 'canonical check count is invalid');
require(expectedChecks.every((name) => evidence.checks?.some((check) => check?.name === name)), 'canonical checks are missing');
require(new Set(evidence.checks?.map((check) => check?.name)).size === expectedChecks.length, 'canonical checks must be unique');
require(Array.isArray(evidence.controlsVerified), 'controlsVerified must be an array');
require(Array.isArray(evidence.remainingControls), 'remainingControls must be an array');
require(typeof evidence.summary === 'string' && evidence.summary.length >= 50, 'summary is missing');
require(String(evidence.productionGate ?? '').length > 0, 'production gate is missing');
require(evidence.evidenceIntegrity?.containsSensitiveValues === false, 'sensitive values must not be stored');
require(evidence.evidenceIntegrity?.runtimeProofInvented === false, 'runtime proof must not be invented');
require(evidence.evidenceIntegrity?.rawCredentialsStored === false, 'credentials must not be stored');
require(evidence.evidenceIntegrity?.accessTokensStored === false, 'tokens must not be stored');
require(evidence.evidenceIntegrity?.cookiesStored === false, 'cookies must not be stored');
require(evidence.evidenceIntegrity?.userIdentifiersStored === false, 'user identifiers must not be stored');
require(evidence.evidenceIntegrity?.organizationIdentifiersStored === false, 'organization identifiers must not be stored');
require(evidence.evidenceIntegrity?.rawProviderResponsesStored === false, 'raw provider responses must not be stored');

for (const check of evidence.checks ?? []) {
  const passed = check?.passed === true;
  const unverified = check?.status === 'NOT_VERIFIED' && typeof check?.reason === 'string' && check.reason.length >= 20;
  require(passed || unverified, `${check?.name ?? 'unknown'} must pass explicitly or remain NOT_VERIFIED with a reason`);
}

const passedNames = (evidence.checks ?? []).filter((check) => check?.passed === true).map((check) => check.name);
require(JSON.stringify(evidence.controlsVerified) === JSON.stringify(passedNames), 'controlsVerified must match explicitly passed checks');
require(expectedChecks.every((name) => passedNames.includes(name) || evidence.remainingControls.includes(name)), 'remaining controls are incomplete');

if (evidence.status === 'Complete') {
  require(evidence.outcome === 'passed', 'Complete evidence must pass');
  require(passedNames.length === expectedChecks.length, 'Complete evidence requires every canonical check');
  require(evidence.evidenceIntegrity?.exactShaBound === true, 'Complete evidence must be exact-SHA bound');
  require(evidence.productionGate === 'eligible for downstream enterprise gates', 'Complete production gate is invalid');
} else {
  require(evidence.outcome !== 'passed', 'Open evidence cannot report passed outcome');
  require(evidence.productionGate === 'blocked', 'Open evidence must block production');
}

if (failures.length > 0) {
  console.error('Auth/RBAC scorecard evidence validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Validated Auth/RBAC scorecard evidence: ${evidence.status}/${evidence.outcome}`);
