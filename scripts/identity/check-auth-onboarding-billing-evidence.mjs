#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const path = process.argv[2] ?? 'artifacts/auth-onboarding-billing-runtime-proof/evidence.json';
const text = readFileSync(path, 'utf8');
const evidence = JSON.parse(text);
const failures = [];

if (evidence?.schema !== 'risck-comply.auth-onboarding-billing-runtime-evidence.v1') failures.push('schema_invalid');
if (evidence?.evidenceItem !== 'auth-onboarding-billing-runtime-proof') failures.push('evidence_item_invalid');
if (evidence?.status !== 'Complete') failures.push('status_not_complete');
if (evidence?.outcome !== 'passed') failures.push('outcome_not_passed');
if (!/^[a-f0-9]{40}$/i.test(String(evidence?.releaseSha ?? ''))) failures.push('release_sha_invalid');
if (!['staging', 'production'].includes(evidence?.targetEnvironment)) failures.push('target_environment_invalid');
if (!/^[a-z][a-z0-9_-]{1,119}$/.test(String(evidence?.expectedPlan ?? ''))) failures.push('expected_plan_invalid');
if (evidence?.authorityPolicy?.productionRequiresLiveStripeAuthority !== true) failures.push('production_live_authority_policy_invalid');
if (!Array.isArray(evidence?.authorityPolicy?.authoritativeSubscriptionEventTypes)
  || evidence.authorityPolicy.authoritativeSubscriptionEventTypes.length !== 2
  || !evidence.authorityPolicy.authoritativeSubscriptionEventTypes.includes('customer.subscription.created')
  || !evidence.authorityPolicy.authoritativeSubscriptionEventTypes.includes('customer.subscription.updated')) {
  failures.push('authoritative_event_policy_invalid');
}

const baseRequiredChecks = [
  'schemaReady',
  'organizationObserved',
  'organizationOnboardingCompleted',
  'organizationPlanMatches',
  'activationRunObserved',
  'activationPlanMatches',
  'subscriptionObserved',
  'subscriptionActive',
  'subscriptionPlanMatches',
  'stripeBindingPresent',
  'entitlementsPresent',
  'stripeEventProcessed',
  'stripeEventAuthoritativeType',
  'stripeEventBindingMatches',
  'webhookAuditObserved',
  'subscriptionUpdatedAuditObserved',
  'subscriptionSyncedAuditObserved',
  'auditHashesPresent',
  'auditPredecessorLinksResolve',
];
const productionRequiredChecks = [
  'stripeEventLiveMode',
  'productionLiveAuthorityRequired',
];
const requiredChecks = evidence?.targetEnvironment === 'production'
  ? [...baseRequiredChecks, ...productionRequiredChecks]
  : baseRequiredChecks;
for (const check of requiredChecks) {
  if (evidence?.checks?.[check] !== true) failures.push(`check_failed:${check}`);
}

if (evidence?.targetEnvironment === 'production') {
  if (evidence?.authorityPolicy?.liveStripeAuthorityRequired !== true) failures.push('production_live_authority_requirement_missing');
} else if (evidence?.targetEnvironment === 'staging') {
  if (evidence?.authorityPolicy?.liveStripeAuthorityRequired !== false) failures.push('staging_live_authority_boundary_invalid');
}

if (!Array.isArray(evidence?.failures) || evidence.failures.length !== 0) failures.push('evidence_contains_failures');
if (evidence?.correlation?.rawIdentifiersStored !== false) failures.push('raw_identifier_boundary_invalid');
if (evidence?.integrity?.secretsStored !== false) failures.push('secret_boundary_invalid');
if (evidence?.integrity?.credentialsStored !== false) failures.push('credential_boundary_invalid');
if (evidence?.integrity?.connectionStringsStored !== false) failures.push('connection_boundary_invalid');
if (evidence?.integrity?.rawDatabaseRowsStored !== false) failures.push('raw_row_boundary_invalid');
if (!/^[a-f0-9]{64}$/.test(String(evidence?.integrity?.sourceSha256 ?? ''))) failures.push('source_digest_invalid');
if (!Number.isSafeInteger(evidence?.integrity?.sourceByteLength) || evidence.integrity.sourceByteLength <= 0) failures.push('source_length_invalid');

const forbidden = [
  /postgres(?:ql)?:\/\//i,
  /supabase\.co/i,
  /service[_-]?role/i,
  /whsec_[A-Za-z0-9_=-]+/i,
  /(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9_=-]+/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /\bevt_[A-Za-z0-9]+\b/,
  /\b(?:cus|sub)_[A-Za-z0-9]+\b/,
];
for (const pattern of forbidden) {
  if (pattern.test(text)) failures.push(`forbidden_pattern:${pattern.source}`);
}

if (failures.length) {
  console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ valid: true, releaseSha: evidence.releaseSha, status: evidence.status }));
