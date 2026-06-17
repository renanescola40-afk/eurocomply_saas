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
if (evidence.control !== 'sso-saml-oidc') fail('control must be sso-saml-oidc');
if (!['Complete', 'Exception'].includes(evidence.status)) fail('status must be Complete or Exception');
if (evidence.redaction !== requiredRedaction) fail('redaction statement is missing or invalid');
if (!evidence.reviewedAt || !evidence.reviewer || !evidence.targetEnvironment) fail('reviewedAt, reviewer, and targetEnvironment are required');

if (!Array.isArray(evidence.identityProtocolsReviewed) || evidence.identityProtocolsReviewed.length === 0) fail('identityProtocolsReviewed must include at least one entry');
for (const entry of evidence.identityProtocolsReviewed) {
  if (!entry.protocol || !entry.provider || !entry.tenantOrOrgScope || !entry.status || !entry.evidenceLocation) fail('each identity protocol entry must include required fields');
  if (!allowedProtocols.has(entry.protocol)) fail(`${entry.protocol} is not an allowed identity protocol`);
  if (evidence.status === 'Complete' && entry.status !== 'configured') fail(`${entry.provider} must have status configured for Complete evidence`);
}

if (!Array.isArray(evidence.accessBoundariesReviewed) || evidence.accessBoundariesReviewed.length === 0) fail('accessBoundariesReviewed must include at least one boundary');
for (const boundary of evidence.accessBoundariesReviewed) {
  if (!boundary.boundary || !Array.isArray(boundary.mappedRolesOrGroups) || boundary.mappedRolesOrGroups.length === 0 || !boundary.evidenceLocation) fail('each access boundary must include boundary, mappedRolesOrGroups, and evidenceLocation');
}

if (!Array.isArray(evidence.controlsVerified) || evidence.controlsVerified.length < 5) fail('controlsVerified must include at least five controls');
if (!evidence.nextReviewDue) fail('nextReviewDue is required');

if (evidence.status === 'Exception') {
  if (!evidence.exception || !evidence.exception.riskOwner || !evidence.exception.rationale || !evidence.exception.expiresAt || !evidence.exception.approvalReference) fail('Exception evidence requires riskOwner, rationale, expiresAt, and approvalReference');
  if (!Array.isArray(evidence.exception.compensatingControls) || evidence.exception.compensatingControls.length === 0) fail('Exception evidence requires compensatingControls');
}

console.log(`P1 identity access evidence is valid: ${evidencePath}`);
