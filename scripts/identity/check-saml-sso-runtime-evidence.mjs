#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const path = process.env.SAML_RUNTIME_OUTPUT
  || 'artifacts/saml-sso-runtime-proof/saml-sso-runtime-validation.json';
const expectedSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
const failures = [];
let evidence = null;

if (!existsSync(path)) failures.push('SAML SSO runtime evidence is missing');
try {
  if (existsSync(path)) evidence = JSON.parse(readFileSync(path, 'utf8'));
} catch {
  failures.push('SAML SSO runtime evidence is invalid JSON');
}

const requiredChecks = [
  'protectedMainExecution',
  'exactShaBound',
  'explicitConfirmation',
  'httpsTargets',
  'connectionSecretValid',
  'runtimeReleaseNoStore',
  'runtimeReleaseShaMatched',
  'samlConnectionActive',
  'verifiedDomainConfigured',
  'providerBindingConfigured',
  'ssoEntitlementActive',
  'baselineCaptured',
  'newSamlLoginObserved',
  'auditConnectionBound',
  'auditProviderMatched',
  'provisioningOutcomeAccepted',
  'connectionLastLoginAdvanced',
  'postLoginEntitlementActive',
];

if (evidence) {
  if (evidence.schema !== 'risck-comply.saml-sso-runtime-evidence.v1') failures.push('SAML evidence schema is invalid');
  if (evidence.evidenceItem !== 'saml-sso-runtime-validation') failures.push('SAML evidence item is invalid');
  if (evidence.status !== 'Complete' || evidence.outcome !== 'passed') failures.push('SAML evidence must be Complete/passed');
  if (!/^[a-f0-9]{40}$/.test(String(evidence.targetSha ?? ''))) failures.push('SAML target SHA is invalid');
  if (evidence.observedSha !== evidence.targetSha) failures.push('SAML observed SHA does not match target SHA');
  if (evidence.runtimeObservedSha !== evidence.targetSha) failures.push('SAML runtime SHA does not match target SHA');
  if (expectedSha && evidence.targetSha !== expectedSha) failures.push('SAML evidence does not match the requested SHA');
  if (!evidence.repository || !evidence.runId) failures.push('SAML repository/run provenance is missing');
  if (JSON.stringify(evidence.controlsVerified) !== JSON.stringify(['IAM-09'])) failures.push('SAML control mapping is invalid');
  for (const check of requiredChecks) {
    if (evidence.checks?.[check] !== true) failures.push(`SAML check ${check} must pass`);
  }
  if (!Array.isArray(evidence.failures) || evidence.failures.length !== 0) failures.push('SAML evidence contains failures');

  const integrity = evidence.evidenceIntegrity ?? {};
  for (const field of [
    'containsSensitiveValues',
    'serviceRoleStored',
    'healthTokenStored',
    'emailStored',
    'assertionStored',
    'identityIdentifiersStored',
    'organizationIdentifiersStored',
    'providerIdentifiersStored',
    'auditPayloadStored',
    'networkHeadersStored',
    'eventTimestampStored',
  ]) {
    if (integrity[field] !== false) failures.push(`SAML evidence integrity field ${field} is unsafe`);
  }
  if (integrity.newEventRequired !== true) failures.push('SAML evidence did not require a new login event');

  const serialized = JSON.stringify(evidence).toLowerCase();
  for (const forbidden of [
    'authorization',
    'bearer ',
    'service_role',
    'access_token',
    'refresh_token',
    'samlresponse',
    '<assertion',
    'provider_id',
    'connection_id',
    'organization_id',
    'actor_user_id',
    '@',
  ]) {
    if (serialized.includes(forbidden)) failures.push(`SAML evidence contains forbidden value: ${forbidden}`);
  }
  if (/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(serialized)) {
    failures.push('SAML evidence contains a raw UUID');
  }
}

if (failures.length > 0) {
  console.error('SAML SSO runtime evidence validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('SAML SSO runtime evidence validation passed.');
