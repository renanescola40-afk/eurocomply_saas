#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  evaluateRuntimeReleaseSha,
  sanitizeRuntimeReleaseResponse,
} from '../release/runtime-release-sha-contract.mjs';

const env = (name) => String(process.env[name] ?? '').trim();
const output = env('SAML_RUNTIME_OUTPUT')
  || 'artifacts/saml-sso-runtime-proof/saml-sso-runtime-validation.json';
const failures = [];
const proofStartedAt = new Date();
const requiredEnv = [
  'PRODUCTION_URL',
  'HEALTHCHECK_TOKEN',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SAML_PROOF_CONNECTION_ID',
  'SAML_PROOF_CONFIRMATION',
  'TARGET_SHA',
];

const checks = {
  protectedMainExecution: env('GITHUB_ACTIONS') === 'true' && env('GITHUB_REF_NAME') === 'main',
  exactShaBound: /^[a-f0-9]{40}$/.test(env('TARGET_SHA'))
    && env('GITHUB_SHA').toLowerCase() === env('TARGET_SHA').toLowerCase(),
  explicitConfirmation: env('SAML_PROOF_CONFIRMATION') === 'EXECUTE_SAML_SSO_RUNTIME_PROOF',
};

for (const name of requiredEnv) {
  if (!env(name)) failures.push(`missing_${name.toLowerCase()}`);
}

function requireCondition(value, code) {
  if (!value) throw new Error(code);
}

function safeOrigin(value, code) {
  const url = new URL(value);
  requireCondition(
    url.protocol === 'https:'
      && !url.username
      && !url.password
      && !url.search
      && !url.hash,
    code,
  );
  return url.origin;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function firstRow(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value && typeof value === 'object' ? value : null;
}

function parseTimestamp(value) {
  const time = Date.parse(String(value ?? ''));
  return Number.isFinite(time) ? time : null;
}

function exactTimestampBoundary(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const raw = String(value).trim();
  requireCondition(raw.length <= 64 && parseTimestamp(raw) !== null, 'baseline_timestamp_invalid');
  return raw;
}

function boundedTimeout() {
  const configured = Number.parseInt(env('SAML_PROOF_TIMEOUT_MS') || '900000', 10);
  if (!Number.isFinite(configured)) return 900000;
  return Math.min(Math.max(configured, 60000), 1200000);
}

async function readBoundedJson(response, maxBytes = 64 * 1024) {
  const declared = Number.parseInt(response.headers.get('content-length') || '0', 10);
  requireCondition(!Number.isFinite(declared) || declared <= maxBytes, 'response_too_large');
  const text = await response.text();
  requireCondition(Buffer.byteLength(text, 'utf8') <= maxBytes, 'response_too_large');
  return text ? JSON.parse(text) : null;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
  });
  const body = await readBoundedJson(response);
  requireCondition(response.ok, `remote_status_${response.status}`);
  return { response, body };
}

const serviceRole = env('SUPABASE_SERVICE_ROLE_KEY');
let appOrigin = null;
let supabaseOrigin = null;
try {
  appOrigin = safeOrigin(env('PRODUCTION_URL'), 'production_url_must_be_https_origin');
  supabaseOrigin = safeOrigin(env('NEXT_PUBLIC_SUPABASE_URL'), 'supabase_url_must_be_https_origin');
  checks.httpsTargets = true;
} catch (error) {
  failures.push(error instanceof Error ? error.message : 'invalid_https_target');
  checks.httpsTargets = false;
}

function supabaseHeaders(json = false) {
  const headers = {
    apikey: serviceRole,
    authorization: `Bearer ${serviceRole}`,
    accept: 'application/json',
  };
  if (json) headers['content-type'] = 'application/json';
  return headers;
}

async function supabaseGet(path) {
  const { body } = await requestJson(`${supabaseOrigin}/rest/v1/${path}`, {
    headers: supabaseHeaders(),
  });
  return body;
}

async function supabaseRpc(name, body) {
  const result = await requestJson(`${supabaseOrigin}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: supabaseHeaders(true),
    body: JSON.stringify(body),
  });
  return result.body;
}

async function loadConnection(connectionId) {
  const select = [
    'organization_id',
    'protocol',
    'status',
    'verified_domain',
    'supabase_provider_id',
    'last_login_at',
  ].join(',');
  const rows = await supabaseGet(
    `enterprise_identity_connections?id=eq.${encodeURIComponent(connectionId)}`
      + `&select=${encodeURIComponent(select)}&limit=1`,
  );
  return firstRow(rows);
}

async function loadEntitlements(organizationId) {
  return firstRow(await supabaseRpc('resolve_organization_entitlements_v3', {
    p_organization_id: organizationId,
  }));
}

async function loadLatestLoginEvent({ organizationId, connectionId, after }) {
  const filters = [
    `organization_id=eq.${encodeURIComponent(organizationId)}`,
    'action=eq.enterprise.sso_login',
    'entity_type=eq.enterprise_identity_connection',
    `entity_id=eq.${encodeURIComponent(connectionId)}`,
    'select=created_at,metadata',
    'order=created_at.desc',
    'limit=1',
  ];
  if (after) filters.splice(4, 0, `created_at=gt.${encodeURIComponent(after)}`);
  return firstRow(await supabaseGet(`audit_logs?${filters.join('&')}`));
}

function entitlementIsActive(snapshot) {
  return snapshot?.outcome === 'resolved'
    && snapshot?.contract_status === 'active'
    && snapshot?.sso_enabled === true;
}

const acceptedOutcomes = new Set([
  'reserved',
  'already_active',
  'seat_changed',
  'duplicate',
  'existing_membership',
]);

let runtimeObservedSha = null;
let eventObserved = false;

try {
  requireCondition(failures.length === 0, 'saml_preconditions_failed');
  requireCondition(Object.values(checks).every(Boolean), 'saml_execution_context_invalid');
  requireCondition(isUuid(env('SAML_PROOF_CONNECTION_ID')), 'saml_connection_secret_invalid');
  checks.connectionSecretValid = true;

  const releaseResult = await requestJson(`${appOrigin}/api/ready/release`, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${env('HEALTHCHECK_TOKEN')}`,
      'user-agent': 'risck-comply-saml-runtime-proof/1.0',
    },
  });
  const runtimeResponse = sanitizeRuntimeReleaseResponse(releaseResult.body);
  const runtimeEvaluation = evaluateRuntimeReleaseSha({
    expectedCommitSha: env('TARGET_SHA'),
    expectedBuildSha: env('TARGET_SHA'),
    observedCommitSha: runtimeResponse.observedCommitSha,
    endpointStatus: releaseResult.response.status,
    cacheControl: releaseResult.response.headers.get('cache-control') || '',
  });
  requireCondition(runtimeResponse.statusOk && runtimeResponse.available, 'runtime_release_metadata_unavailable');
  requireCondition(
    runtimeResponse.provenance === 'vercel' || runtimeResponse.provenance === 'build-env',
    'runtime_release_provenance_invalid',
  );
  requireCondition(runtimeEvaluation.passed, 'runtime_release_sha_mismatch');
  runtimeObservedSha = runtimeEvaluation.observedCommitSha;
  checks.runtimeReleaseNoStore = runtimeEvaluation.checks
    .find((check) => check.name === 'runtimeReleaseMetadataNoStore')?.passed === true;
  checks.runtimeReleaseShaMatched = true;

  const connectionId = env('SAML_PROOF_CONNECTION_ID');
  const connection = await loadConnection(connectionId);
  requireCondition(connection, 'saml_connection_not_found');
  requireCondition(connection.protocol === 'saml' && connection.status === 'active', 'saml_connection_not_active');
  checks.samlConnectionActive = true;
  requireCondition(
    typeof connection.verified_domain === 'string' && connection.verified_domain.includes('.'),
    'saml_verified_domain_missing',
  );
  checks.verifiedDomainConfigured = true;
  requireCondition(isUuid(String(connection.supabase_provider_id ?? '')), 'saml_provider_binding_missing');
  checks.providerBindingConfigured = true;
  requireCondition(isUuid(String(connection.organization_id ?? '')), 'saml_organization_binding_invalid');

  const beforeEntitlements = await loadEntitlements(connection.organization_id);
  requireCondition(entitlementIsActive(beforeEntitlements), 'saml_entitlement_not_active');
  checks.ssoEntitlementActive = true;

  const baseline = await loadLatestLoginEvent({
    organizationId: connection.organization_id,
    connectionId,
    after: null,
  });
  const after = exactTimestampBoundary(baseline?.created_at, proofStartedAt.toISOString());
  checks.baselineCaptured = true;

  console.log('Waiting for a new SAML SSO login on the dedicated proof connection.');
  console.log('Complete the protected enterprise SSO login flow while this job is running.');

  const deadline = Date.now() + boundedTimeout();
  let observedEvent = null;
  while (Date.now() < deadline) {
    observedEvent = await loadLatestLoginEvent({
      organizationId: connection.organization_id,
      connectionId,
      after,
    });
    if (observedEvent) break;
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  requireCondition(observedEvent, 'new_saml_login_not_observed');
  eventObserved = true;
  checks.newSamlLoginObserved = true;
  checks.auditConnectionBound = true;

  const metadata = observedEvent.metadata && typeof observedEvent.metadata === 'object'
    ? observedEvent.metadata
    : {};
  requireCondition(
    String(metadata.provider_id ?? '') === String(connection.supabase_provider_id),
    'saml_audit_provider_mismatch',
  );
  checks.auditProviderMatched = true;
  requireCondition(acceptedOutcomes.has(String(metadata.outcome ?? '')), 'saml_provisioning_outcome_not_accepted');
  checks.provisioningOutcomeAccepted = true;

  const refreshedConnection = await loadConnection(connectionId);
  const eventTime = parseTimestamp(observedEvent.created_at);
  const lastLoginTime = parseTimestamp(refreshedConnection?.last_login_at);
  requireCondition(
    eventTime !== null && lastLoginTime !== null && lastLoginTime >= eventTime,
    'saml_last_login_not_advanced',
  );
  checks.connectionLastLoginAdvanced = true;

  const afterEntitlements = await loadEntitlements(connection.organization_id);
  requireCondition(entitlementIsActive(afterEntitlements), 'saml_entitlement_changed_after_login');
  checks.postLoginEntitlementActive = true;
} catch (error) {
  failures.push(error instanceof Error ? error.message : 'unknown_saml_runtime_failure');
}

const canonicalChecks = {
  protectedMainExecution: checks.protectedMainExecution === true,
  exactShaBound: checks.exactShaBound === true,
  explicitConfirmation: checks.explicitConfirmation === true,
  httpsTargets: checks.httpsTargets === true,
  connectionSecretValid: checks.connectionSecretValid === true,
  runtimeReleaseNoStore: checks.runtimeReleaseNoStore === true,
  runtimeReleaseShaMatched: checks.runtimeReleaseShaMatched === true,
  samlConnectionActive: checks.samlConnectionActive === true,
  verifiedDomainConfigured: checks.verifiedDomainConfigured === true,
  providerBindingConfigured: checks.providerBindingConfigured === true,
  ssoEntitlementActive: checks.ssoEntitlementActive === true,
  baselineCaptured: checks.baselineCaptured === true,
  newSamlLoginObserved: checks.newSamlLoginObserved === true,
  auditConnectionBound: checks.auditConnectionBound === true,
  auditProviderMatched: checks.auditProviderMatched === true,
  provisioningOutcomeAccepted: checks.provisioningOutcomeAccepted === true,
  connectionLastLoginAdvanced: checks.connectionLastLoginAdvanced === true,
  postLoginEntitlementActive: checks.postLoginEntitlementActive === true,
};

const passed = failures.length === 0 && Object.values(canonicalChecks).every(Boolean);
const evidence = {
  schema: 'risck-comply.saml-sso-runtime-evidence.v1',
  evidenceItem: 'saml-sso-runtime-validation',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  targetSha: env('TARGET_SHA') || null,
  observedSha: checks.exactShaBound ? env('GITHUB_SHA') : null,
  runtimeObservedSha: checks.runtimeReleaseShaMatched ? runtimeObservedSha : null,
  repository: env('GITHUB_REPOSITORY') || null,
  runId: env('GITHUB_RUN_ID') || null,
  controlsVerified: passed ? ['IAM-09'] : [],
  checks: canonicalChecks,
  failures: [...new Set(failures)].sort(),
  evidenceIntegrity: {
    containsSensitiveValues: false,
    serviceRoleStored: false,
    healthTokenStored: false,
    emailStored: false,
    assertionStored: false,
    identityIdentifiersStored: false,
    organizationIdentifiersStored: false,
    providerIdentifiersStored: false,
    auditPayloadStored: false,
    networkHeadersStored: false,
    eventTimestampStored: false,
    newEventRequired: eventObserved,
  },
  boundary: 'Protected exact-SHA production evidence that a newly completed SAML SSO login traversed the configured provider binding, entitlement gate, audit event, and seat-aware provisioning path. It does not claim provider certification, every IdP configuration, customer-specific acceptance, or SCIM behavior.',
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
if (!passed) process.exit(1);
