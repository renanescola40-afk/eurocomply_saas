#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = resolve('docs/security/evidence/runtime/production-secrets-provider-stores.json');
const OUTPUT = resolve('release-validation/provider-blocker-diagnostics.json');
const TARGETS = resolve(process.env.PROVIDER_TARGETS_PATH || 'config/production-provider-targets.json');
const FULL_SHA = /^[a-f0-9]{40}$/;
const TIMEOUT_MS = 8_000;

function env(name) {
  return String(process.env[name] ?? '').trim();
}

export function httpDiagnostic(status, errorCode = null) {
  if (errorCode) return { httpStatus: null, category: errorCode };
  if (!Number.isInteger(status)) return { httpStatus: null, category: 'network_or_unknown' };
  if (status >= 200 && status < 300) return { httpStatus: status, category: 'success' };
  if (status === 401) return { httpStatus: status, category: 'unauthenticated' };
  if (status === 403) return { httpStatus: status, category: 'forbidden_or_insufficient_scope' };
  if (status === 404) return { httpStatus: status, category: 'resource_not_found' };
  if (status === 408) return { httpStatus: status, category: 'request_timeout' };
  if (status === 429) return { httpStatus: status, category: 'rate_limited' };
  if (status >= 500) return { httpStatus: status, category: 'provider_server_error' };
  return { httpStatus: status, category: 'request_rejected' };
}

async function sentryApiProbe(kind, org, project, token) {
  const encodedOrg = encodeURIComponent(org);
  const encodedProject = encodeURIComponent(project);
  const url = kind === 'client_keys'
    ? `https://sentry.io/api/0/projects/${encodedOrg}/${encodedProject}/keys/?status=active`
    : `https://sentry.io/api/0/projects/${encodedOrg}/${encodedProject}/`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const result = httpDiagnostic(response.status);
    await response.body?.cancel().catch(() => undefined);
    return result;
  } catch (error) {
    const name = String(error?.name || '').toLowerCase();
    return httpDiagnostic(null, name.includes('timeout') ? 'timeout' : 'network_error');
  }
}

function providerEntry(evidence, provider) {
  return (Array.isArray(evidence?.providersReviewed) ? evidence.providersReviewed : [])
    .find((entry) => entry?.provider === provider) ?? null;
}

export function deriveSentryProbeBlockerCode(probe) {
  if (!probe?.attempted) return null;
  const categories = [
    probe?.projectProbe?.category,
    probe?.clientKeysProbe?.category,
  ].filter(Boolean);

  if (categories.includes('unauthenticated')) return 'sentry_auth_token_unauthenticated';
  if (categories.includes('forbidden_or_insufficient_scope')) return 'sentry_auth_token_insufficient_scope';
  if (categories.includes('resource_not_found')) return 'sentry_project_not_found_or_inaccessible';
  if (categories.includes('rate_limited')) return 'sentry_api_rate_limited';
  if (categories.some((category) => category === 'request_timeout' || category === 'timeout')) {
    return 'sentry_api_timeout';
  }
  if (categories.includes('provider_server_error')) return 'sentry_provider_server_error';
  if (categories.some((category) => category === 'network_error' || category === 'network_or_unknown')) {
    return 'sentry_network_unavailable';
  }
  if (categories.some((category) => category === 'request_rejected')) return 'sentry_api_request_rejected';
  return null;
}

export function deriveProviderBlockerCodes(entry, probe = null) {
  if (!entry || entry.status === 'reviewed') return [];
  const checks = entry.checks && typeof entry.checks === 'object' ? entry.checks : {};
  const provider = String(entry.provider || 'provider');

  if (provider === 'vercel') {
    const prerequisites = [];
    if (checks.apiTokenConfigured !== true) prerequisites.push('vercel_api_token_missing');
    if (checks.targetConfigurationBound !== true) prerequisites.push('vercel_target_configuration_invalid');
    if (prerequisites.length > 0) return prerequisites;
  }

  if (provider === 'sentry') {
    const prerequisites = [];
    if (checks.organizationConfigured !== true) prerequisites.push('sentry_organization_missing');
    if (checks.projectConfigured !== true) prerequisites.push('sentry_project_missing');
    if (checks.buildAuthTokenConfigured !== true) prerequisites.push('sentry_auth_token_missing');
    if (prerequisites.length > 0) return prerequisites;

    const probeCode = deriveSentryProbeBlockerCode(probe);
    if (probeCode) return [probeCode];
  }

  const explicit = {
    vercel: {
      projectReachable: 'vercel_project_api_unreachable',
      projectIdentityMatched: 'vercel_project_identity_mismatch',
      productionEnvironmentEnumerated: 'vercel_production_environment_inventory_unavailable',
      requiredEnvironmentKeysPresent: 'vercel_required_production_environment_keys_missing',
    },
    sentry: {
      projectReachable: 'sentry_project_api_unreachable',
      clientKeyInventoryReachable: 'sentry_client_key_inventory_unavailable',
      activeClientKeyPresent: 'sentry_active_client_key_missing',
    },
  };
  return Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([check]) => explicit[provider]?.[check] || `${provider}_${check}_failed`);
}

function loadTargets() {
  try {
    return JSON.parse(readFileSync(TARGETS, 'utf8'));
  } catch {
    return null;
  }
}

async function sentryDiagnostics(entry) {
  if (!entry || entry.status === 'reviewed') return null;
  const org = env('SENTRY_ORG');
  const project = env('SENTRY_PROJECT');
  const token = env('SENTRY_AUTH_TOKEN');
  if (!org || !project || !token) return { attempted: false, reason: 'configuration_missing' };
  const [projectProbe, clientKeysProbe] = await Promise.all([
    sentryApiProbe('project', org, project, token),
    sentryApiProbe('client_keys', org, project, token),
  ]);
  return { attempted: true, projectProbe, clientKeysProbe };
}

function vercelDiagnostics(entry) {
  if (!entry || entry.status === 'reviewed') return null;
  const tokenConfigured = Boolean(env('VERCEL_TOKEN'));
  const targets = loadTargets();
  const target = targets?.vercel;
  if (!tokenConfigured) return { attempted: false, reason: 'api_token_missing' };
  if (!target?.teamId || !target?.projectId || !target?.projectName) {
    return { attempted: false, reason: 'target_configuration_missing' };
  }
  return {
    attempted: false,
    reason: 'canonical_provider_proof_is_authoritative',
    targetConfigurationPresent: true,
  };
}

export async function buildProviderBlockerDiagnostics(evidence) {
  const commitSha = String(evidence?.runtimeContext?.commitSha ?? '').trim().toLowerCase();
  if (!FULL_SHA.test(commitSha)) throw new Error('provider_evidence_commit_sha_invalid');

  const providers = Array.isArray(evidence?.providersReviewed) ? evidence.providersReviewed : [];
  const blocked = providers.filter((entry) => entry?.status !== 'reviewed');
  const vercel = providerEntry(evidence, 'vercel');
  const sentry = providerEntry(evidence, 'sentry');
  const [vercelProbe, sentryProbe] = await Promise.all([
    Promise.resolve(vercelDiagnostics(vercel)),
    sentryDiagnostics(sentry),
  ]);
  const probeFor = (entry) => {
    if (entry?.provider === 'vercel') return vercelProbe;
    if (entry?.provider === 'sentry') return sentryProbe;
    return null;
  };
  const providerDiagnostics = blocked.map((entry) => ({
    provider: String(entry.provider || 'unknown'),
    blockerCodes: deriveProviderBlockerCodes(entry, probeFor(entry)),
    ...(entry.metrics ? { metrics: entry.metrics } : {}),
  }));
  const blockerCodes = providerDiagnostics.flatMap((entry) => entry.blockerCodes);

  return {
    schema: 'risck-comply.production-provider-blocker-diagnostics.v1',
    status: 'Complete',
    generatedAt: new Date().toISOString(),
    targetSha: commitSha,
    providerProofStatus: evidence?.status || 'Open',
    providerProofOutcome: evidence?.outcome || 'blocked',
    blockedProviderCount: blocked.length,
    blockerCount: blockerCodes.length,
    blockerCodes,
    providers: providerDiagnostics,
    probes: {
      vercel: vercelProbe,
      sentry: sentryProbe,
    },
    secondaryNetworkProbeScope: 'sentry-only-fixed-origin',
    operatorActionRequired: blocked.length > 0,
    truthBoundary: 'This diagnostic artifact explains why the provider proof is blocked. It never promotes provider evidence, never treats diagnostics as runtime PASS, never sends file-derived provider targets to outbound network requests, and never stores request URLs, provider response bodies, credentials, tokens, DSNs or decrypted environment values.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      credentialsStored: false,
      requestUrlsStored: false,
      providerResponseBodiesStored: false,
      decryptedProviderEnvironmentValuesStored: false,
      fileDerivedOutboundTargetsUsed: false,
      exactShaBound: true,
    },
  };
}

export async function runProviderBlockerDiagnostics() {
  let evidence;
  try {
    evidence = JSON.parse(readFileSync(SOURCE, 'utf8'));
  } catch {
    throw new Error('provider_runtime_evidence_missing_or_invalid');
  }
  const diagnostics = await buildProviderBlockerDiagnostics(evidence);
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(diagnostics, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    targetSha: diagnostics.targetSha,
    blockedProviderCount: diagnostics.blockedProviderCount,
    blockerCodes: diagnostics.blockerCodes,
  }, null, 2));
  return diagnostics;
}

const isMain = process.argv[1]
  && fileURLToPath(new URL(`file://${process.argv[1]}`)) === fileURLToPath(import.meta.url);

if (isMain) {
  runProviderBlockerDiagnostics().catch((error) => {
    console.error(`Provider blocker diagnostics failed: ${error instanceof Error ? error.message : 'unknown_error'}`);
    process.exit(1);
  });
}
