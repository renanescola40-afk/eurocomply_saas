#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const evidencePath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'distributed-rate-limit-sensitive-endpoints.json');
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const fullShaPattern = /^[a-f0-9]{40}$/;
const requiredRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const requiredControls = [
  'Rate limit state is shared across instances',
  'Sensitive endpoints have explicit policies',
  'Bypass paths are documented or blocked',
  'Alerting exists for sustained throttling or abuse',
  'Evidence contains no secrets',
];
const requiredCompleteCategories = ['auth', 'billing', 'documents', 'team', 'audit'];
const requiredRuntimeProof = [
  'sharedSubjectKeyDigestMatched',
  'firstRequestAllowed',
  'secondRequestAllowed',
  'thresholdRequestBlocked',
  'isolatedSubjectAllowed',
  'productionMissingBackendFailedClosed',
  'highRiskAuditFlagObserved',
  'retryAfterObserved',
  'cleanupDeletedSharedKey',
  'cleanupDeletedIsolatedKey',
];
const requiredSourceChecks = [
  'distributedBackendContract',
  'failClosedBypassContract',
  'sustainedAbuseAlertContract',
  'sensitiveEndpointCoverage',
];

function fail(message) {
  console.error(`P1 rate limit evidence check failed: ${message}`);
  process.exit(1);
}

function hasControl(controls, expected) {
  return controls.some((control) => String(control).trim().toLowerCase() === expected.toLowerCase());
}

function assertNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) fail(`${field} is required`);
}

if (!fs.existsSync(evidencePath)) {
  console.log(`P1 rate limit evidence is open: ${evidencePath} is not present yet.`);
  process.exit(0);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${evidencePath}: ${error.message}`);
}

if (placeholderPattern.test(JSON.stringify(evidence))) fail('evidence must not contain placeholders');
if (evidence.schemaVersion !== 1) fail('schemaVersion must be 1');
if (evidence.controlId !== 'P1-04') fail('controlId must be P1-04');
if (evidence.control !== 'distributed-rate-limit-sensitive-endpoints') fail('control must be distributed-rate-limit-sensitive-endpoints');
if (evidence.status !== 'Complete') fail('status must be Complete');
if (evidence.evidenceKind !== 'final-p1-control-evidence') fail('evidenceKind must be final-p1-control-evidence');
if (evidence.generatedFromRealEvidence !== true) fail('generatedFromRealEvidence must be true');
if (evidence.productionValidated !== true) fail('productionValidated must be true');
if (evidence.redaction !== requiredRedaction) fail('redaction statement is missing or invalid');

assertNonEmptyString(evidence.generatedAt, 'generatedAt');
assertNonEmptyString(evidence.reviewedAt, 'reviewedAt');
assertNonEmptyString(evidence.reviewer, 'reviewer');
assertNonEmptyString(evidence.nextReviewDue, 'nextReviewDue');
assertNonEmptyString(evidence.environment, 'environment');
if (!['production', 'prod'].includes(evidence.environment.trim().toLowerCase())) fail('environment must be production');

if (!fullShaPattern.test(String(evidence.targetSha || ''))) fail('targetSha must be a full lowercase Git SHA');
if (evidence.observedSha !== evidence.targetSha) fail('observedSha must match targetSha');
const expectedSha = String(process.env.ENTERPRISE_EXPECTED_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
if (expectedSha && evidence.targetSha !== expectedSha) fail('targetSha must match the assessed SHA');
if (evidence.repository !== 'renanescola40-afk/eurocomply_saas') fail('repository must be canonical');

if (!evidence.sourceWorkflow || evidence.sourceWorkflow.name !== 'Distributed Rate Limit Runtime Proof') fail('sourceWorkflow.name is invalid');
if (!/^\d+$/.test(String(evidence.sourceWorkflow.runId || ''))) fail('sourceWorkflow.runId must be numeric');
assertNonEmptyString(evidence.sourceWorkflow.event, 'sourceWorkflow.event');

if (!evidence.validation || evidence.validation.result !== 'pass') fail('validation.result must be pass');
assertNonEmptyString(evidence.validation.validatedAt, 'validation.validatedAt');
assertNonEmptyString(evidence.validation.validator, 'validation.validator');
assertNonEmptyString(evidence.validation.method, 'validation.method');
if (!evidence.validation.method.includes('independent Node.js processes')) fail('validation.method must describe independent process validation');

if (!Array.isArray(evidence.artifacts) || evidence.artifacts.length < 2) fail('artifacts must include protected runtime and exact-SHA source references');
for (const [index, artifact] of evidence.artifacts.entries()) {
  assertNonEmptyString(artifact.type, `artifacts[${index}].type`);
  assertNonEmptyString(artifact.reference, `artifacts[${index}].reference`);
  assertNonEmptyString(artifact.description, `artifacts[${index}].description`);
  assertNonEmptyString(artifact.collectedAt, `artifacts[${index}].collectedAt`);
}
if (!evidence.artifacts.some((artifact) => artifact.type === 'protected-runtime-workflow')) fail('protected runtime workflow artifact is required');
if (!evidence.artifacts.some((artifact) => artifact.type === 'exact-sha-source-contract')) fail('exact-SHA source contract artifact is required');

if (!evidence.rateLimitBackend || evidence.rateLimitBackend.scope !== 'distributed' || !evidence.rateLimitBackend.provider || !evidence.rateLimitBackend.evidenceLocation) fail('rateLimitBackend must identify a distributed backend provider and evidenceLocation');
if (!['upstash', 'redis', 'upstash redis'].includes(String(evidence.rateLimitBackend.provider).trim().toLowerCase())) fail('rateLimitBackend.provider must identify Upstash/Redis');

if (!Array.isArray(evidence.sensitiveEndpointsReviewed) || evidence.sensitiveEndpointsReviewed.length === 0) fail('sensitiveEndpointsReviewed must include at least one endpoint');
const categories = new Set();
for (const endpoint of evidence.sensitiveEndpointsReviewed) {
  if (!endpoint.endpoint || !endpoint.category || !endpoint.limitPolicy || !endpoint.keyingStrategy || !endpoint.status || !endpoint.evidenceLocation) fail('each sensitive endpoint must include endpoint, category, limitPolicy, keyingStrategy, status, and evidenceLocation');
  categories.add(String(endpoint.category).trim().toLowerCase());
  if (endpoint.status !== 'enforced') fail(`${endpoint.endpoint} must have status enforced for Complete evidence`);
}

for (const category of requiredCompleteCategories) {
  if (!categories.has(category)) fail(`Complete evidence must include rate limit coverage for category: ${category}`);
}

if (!Array.isArray(evidence.controlsVerified)) fail('controlsVerified must be an array');
for (const control of requiredControls) {
  if (!hasControl(evidence.controlsVerified, control)) fail(`controlsVerified must include: ${control}`);
}

if (!evidence.runtimeProof || evidence.runtimeProof.independentProcessCount < 4) fail('runtimeProof must include at least four independent process executions');
for (const field of requiredRuntimeProof) {
  if (evidence.runtimeProof[field] !== true) fail(`runtimeProof.${field} must be true`);
}

if (!evidence.sourceChecks) fail('sourceChecks are required');
for (const field of requiredSourceChecks) {
  if (evidence.sourceChecks[field] !== true) fail(`sourceChecks.${field} must be true`);
}

if (!Array.isArray(evidence.checks) || evidence.checks.length === 0 || evidence.checks.some((check) => check?.passed !== true)) fail('all evidence checks must pass');
if (!Array.isArray(evidence.failures) || evidence.failures.length !== 0) fail('failures must be an empty array');

const integrity = evidence.evidenceIntegrity;
if (!integrity
  || integrity.containsSensitiveValues !== false
  || integrity.redisUrlStored !== false
  || integrity.redisTokenStored !== false
  || integrity.rawRedisKeyStored !== false
  || integrity.rawProviderResponseStored !== false
  || integrity.customerDataStored !== false
  || integrity.syntheticDataOnly !== true
  || integrity.cleanupAttempted !== true
  || integrity.manualBooleanProofAccepted !== false
  || integrity.exactShaBound !== true) {
  fail('evidence integrity and redaction contract is incomplete');
}

assertNonEmptyString(evidence.evidenceBoundary, 'evidenceBoundary');
if (!evidence.evidenceBoundary.includes('does not prove CDN or WAF rate limiting')) fail('evidenceBoundary must preserve external-control limitations');

console.log(`P1 rate limit evidence is valid: ${evidencePath}`);
