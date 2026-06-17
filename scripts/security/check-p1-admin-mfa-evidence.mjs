#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = process.argv[2] || path.join('docs', 'security', 'evidence', 'p1', 'admin-mfa-required.json');
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredRedaction = 'All secrets, tokens, credentials, connection strings, and access-granting values are redacted.';

function fail(message) {
  console.error(`P1 admin MFA evidence check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(evidencePath)) {
  console.log(`P1 admin MFA evidence is open: ${evidencePath} is not present yet.`);
  process.exit(0);
}

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${evidencePath}: ${error.message}`);
}

if (placeholderPattern.test(JSON.stringify(evidence))) fail('evidence must not contain placeholders');
if (evidence.control !== 'admin-mfa-required') fail('control must be admin-mfa-required');
if (!['Complete', 'Exception'].includes(evidence.status)) fail('status must be Complete or Exception');
if (evidence.redaction !== requiredRedaction) fail('redaction statement is missing or invalid');
if (!evidence.reviewedAt || !evidence.reviewer || !evidence.targetEnvironment) fail('reviewedAt, reviewer, and targetEnvironment are required');

if (!Array.isArray(evidence.identityProvidersReviewed) || evidence.identityProvidersReviewed.length === 0) fail('identityProvidersReviewed must include at least one provider');
for (const provider of evidence.identityProvidersReviewed) {
  if (!provider.provider || !provider.adminPopulation || !provider.mfaPolicy || !provider.status || !provider.evidenceLocation) fail('each identity provider entry must include required fields');
  if (evidence.status === 'Complete' && provider.status !== 'enforced') fail(`${provider.provider} must have status enforced for Complete evidence`);
}

if (!Array.isArray(evidence.adminSurfacesReviewed) || evidence.adminSurfacesReviewed.length === 0) fail('adminSurfacesReviewed must include at least one admin surface');
for (const surface of evidence.adminSurfacesReviewed) {
  if (!surface.surface || !surface.accessPath || !surface.evidenceLocation) fail('each admin surface entry must include required fields');
  if (evidence.status === 'Complete' && surface.mfaEnforced !== true) fail(`${surface.surface} must have mfaEnforced=true for Complete evidence`);
}

if (!Array.isArray(evidence.breakGlassAccounts)) fail('breakGlassAccounts must be an array, even when empty');
for (const account of evidence.breakGlassAccounts) {
  if (!account.accountReference) fail('each break-glass account must include accountReference');
  if (evidence.status === 'Complete') {
    for (const key of ['mfaEnforced', 'storageReviewed', 'rotationReviewed']) {
      if (account[key] !== true) fail(`break-glass account ${account.accountReference} must have ${key}=true`);
    }
  }
}

if (!Array.isArray(evidence.controlsVerified) || evidence.controlsVerified.length < 5) fail('controlsVerified must include at least five controls');
if (!evidence.nextReviewDue) fail('nextReviewDue is required');

if (evidence.status === 'Exception') {
  if (!evidence.exception || !evidence.exception.riskOwner || !evidence.exception.rationale || !evidence.exception.expiresAt || !evidence.exception.approvalReference) fail('Exception evidence requires riskOwner, rationale, expiresAt, and approvalReference');
  if (!Array.isArray(evidence.exception.compensatingControls) || evidence.exception.compensatingControls.length === 0) fail('Exception evidence requires compensatingControls');
}

console.log(`P1 admin MFA evidence is valid: ${evidencePath}`);
