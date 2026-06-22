#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'sso-saml-oidc.json');
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';
const allowedProtocols = new Set(['SAML', 'OIDC']);

function fail(message) {
  console.error(`P1 identity access evidence check failed: ${message}`);
  process.exit(1);
}

function assertString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) fail(`${field} is required`);
}

if (!fs.existsSync(evidencePath)) {
  console.log(`P1 identity access evidence is open: ${evidencePath} is not present yet.`);
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
if (evidence.controlId !== 'P1-01') fail('controlId must be P1-01');
if (evidence.control !== 'sso-saml-oidc') fail('control must be sso-saml-oidc');
if (evidence.status !== 'Complete') fail('status must be Complete');
if (evidence.evidenceKind !== 'final-p1-control-evidence') fail('evidenceKind must be final-p1-control-evidence');
if (evidence.generatedFromRealEvidence !== true) fail('generatedFromRealEvidence must be true');
if (evidence.productionValidated !== true) fail('productionValidated must be true');
if (evidence.redaction !== requiredRedaction) fail('redaction statement is missing or invalid');

for (const field of ['generatedAt', 'reviewedAt', 'reviewer', 'nextReviewDue', 'environment']) assertString(evidence[field], field);
if (!['production', 'prod'].includes(evidence.environment.trim().toLowerCase())) fail('environment must be production');

if (!evidence.validation || evidence.validation.result !== 'pass') fail('validation.result must be pass');
for (const field of ['validatedAt', 'validator', 'method']) assertString(evidence.validation[field], `validation.${field}`);

if (!Array.isArray(evidence.artifacts) || evidence.artifacts.length === 0) fail('artifacts must include at least one evidence reference');
for (const [index, artifact] of evidence.artifacts.entries()) {
  for (const field of ['type', 'reference', 'description', 'collectedAt']) assertString(artifact[field], `artifacts[${index}].${field}`);
}

if (!Array.isArray(evidence.identityProtocolsReviewed) || evidence.identityProtocolsReviewed.length === 0) fail('identityProtocolsReviewed must include at least one entry');
for (const entry of evidence.identityProtocolsReviewed) {
  for (const field of ['protocol', 'provider', 'tenantOrOrgScope', 'status', 'evidenceLocation']) assertString(entry[field], `identityProtocolsReviewed.${field}`);
  if (!allowedProtocols.has(entry.protocol)) fail(`${entry.protocol} is not an allowed identity protocol`);
  if (entry.status !== 'configured') fail(`${entry.provider} must have status configured`);
}

if (!Array.isArray(evidence.accessBoundariesReviewed) || evidence.accessBoundariesReviewed.length === 0) fail('accessBoundariesReviewed must include at least one boundary');
for (const boundary of evidence.accessBoundariesReviewed) {
  assertString(boundary.boundary, 'access boundary name');
  if (!Array.isArray(boundary.mappedRolesOrGroups) || boundary.mappedRolesOrGroups.length === 0) fail('each access boundary must include mappedRolesOrGroups');
  assertString(boundary.evidenceLocation, 'access boundary evidenceLocation');
}

if (!Array.isArray(evidence.controlsVerified) || evidence.controlsVerified.length < 5) fail('controlsVerified must include at least five controls');

console.log(`P1 identity access evidence is valid: ${evidencePath}`);
