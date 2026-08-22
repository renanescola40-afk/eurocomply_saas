#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const OUTPUT = resolve('release-validation/supabase-provider-resilience.json');
const MANAGEMENT_API = 'https://api.supabase.com';
const API_TIMEOUT_MS = 8_000;
const PROJECT_REF = /^[a-z0-9]{20}$/;
const PRODUCTION_ELIGIBLE_PLANS = new Set(['pro', 'team', 'enterprise']);

function env(name) {
  return String(process.env[name] ?? '').trim();
}

export function deriveSupabaseProjectRef(rawValue) {
  try {
    const url = new URL(String(rawValue ?? '').trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return null;
    if (url.pathname !== '' && url.pathname !== '/') return null;
    const match = /^([a-z0-9]{20})\.supabase\.co$/.exec(url.hostname.toLowerCase());
    return match && PROJECT_REF.test(match[1]) ? match[1] : null;
  } catch {
    return null;
  }
}

function normalizePlan(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function evaluateSupabaseProviderResilience({ projectRef, projects, organization, backups }) {
  const projectList = Array.isArray(projects) ? projects : [];
  const project = projectList.find((entry) => String(entry?.ref ?? '').toLowerCase() === String(projectRef ?? '').toLowerCase());
  const organizationSlug = String(project?.organization_slug ?? '').trim();
  const plan = normalizePlan(organization?.plan);
  const backupList = Array.isArray(backups?.backups) ? backups.backups : [];
  const completedBackupCount = backupList.filter((backup) => String(backup?.status ?? '').toUpperCase() === 'COMPLETED').length;
  const managedBackupObserved = backups?.walg_enabled === true || completedBackupCount > 0;

  const checks = {
    projectIdentityMatched: Boolean(project),
    projectHealthy: project?.status === 'ACTIVE_HEALTHY',
    organizationBindingPresent: Boolean(organizationSlug),
    organizationPlanObserved: Boolean(plan),
    productionEligiblePlan: PRODUCTION_ELIGIBLE_PLANS.has(plan),
    backupCapabilityObserved: typeof backups?.walg_enabled === 'boolean',
    managedBackupObserved,
    pitrStateObserved: typeof backups?.pitr_enabled === 'boolean',
  };

  const blockerCodes = [];
  if (!checks.projectIdentityMatched) blockerCodes.push('supabase_project_identity_mismatch');
  if (!checks.projectHealthy) blockerCodes.push('supabase_project_not_active_healthy');
  if (!checks.organizationBindingPresent) blockerCodes.push('supabase_organization_binding_missing');
  if (!checks.organizationPlanObserved) blockerCodes.push('supabase_organization_plan_missing');
  if (!checks.productionEligiblePlan) blockerCodes.push('supabase_plan_not_production_eligible');
  if (!checks.backupCapabilityObserved) blockerCodes.push('supabase_backup_capability_state_missing');
  if (!checks.managedBackupObserved) blockerCodes.push('supabase_managed_backup_not_observed');
  if (!checks.pitrStateObserved) blockerCodes.push('supabase_pitr_state_missing');

  return {
    checks,
    blockerCodes,
    metrics: {
      completedManagedBackupsObserved: completedBackupCount,
      pitrEnabled: backups?.pitr_enabled === true,
    },
    organizationSlug,
  };
}

async function requestJson(pathname, token) {
  let response;
  try {
    response = await fetch(`${MANAGEMENT_API}${pathname}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch {
    return { reachable: false, status: null, body: null };
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    return { reachable: false, status: response.status, body: null };
  }

  try {
    return { reachable: true, status: response.status, body: await response.json() };
  } catch {
    return { reachable: false, status: response.status, body: null };
  }
}

export async function buildSupabaseProviderResilienceEvidence({
  publicSupabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL'),
  accessToken = env('SUPABASE_ACCESS_TOKEN'),
  targetSha = env('TARGET_SHA') || env('GITHUB_SHA'),
  generatedAt = new Date().toISOString(),
} = {}) {
  const projectRef = deriveSupabaseProjectRef(publicSupabaseUrl);
  const tokenConfigured = Boolean(accessToken);
  const projectRefDerived = Boolean(projectRef);
  const blockerCodes = [];

  if (!tokenConfigured) blockerCodes.push('supabase_management_token_missing');
  if (!projectRefDerived) blockerCodes.push('supabase_project_ref_unverifiable');

  let projectsResult = { reachable: false, body: null };
  let organizationResult = { reachable: false, body: null };
  let backupsResult = { reachable: false, body: null };
  let evaluation = null;

  if (tokenConfigured && projectRefDerived) {
    projectsResult = await requestJson('/v1/projects', accessToken);
    if (!projectsResult.reachable) blockerCodes.push('supabase_project_management_api_unreachable');

    const project = Array.isArray(projectsResult.body)
      ? projectsResult.body.find((entry) => String(entry?.ref ?? '').toLowerCase() === projectRef)
      : null;
    const organizationSlug = String(project?.organization_slug ?? '').trim();

    if (projectsResult.reachable && project && organizationSlug) {
      organizationResult = await requestJson(`/v1/organizations/${encodeURIComponent(organizationSlug)}`, accessToken);
      if (!organizationResult.reachable) blockerCodes.push('supabase_organization_management_api_unreachable');

      backupsResult = await requestJson(`/v1/projects/${encodeURIComponent(projectRef)}/database/backups`, accessToken);
      if (!backupsResult.reachable) blockerCodes.push('supabase_backup_inventory_unreachable');
    } else if (projectsResult.reachable && !project) {
      blockerCodes.push('supabase_project_identity_mismatch');
    } else if (projectsResult.reachable && project && !organizationSlug) {
      blockerCodes.push('supabase_organization_binding_missing');
    }

    if (projectsResult.reachable && organizationResult.reachable && backupsResult.reachable) {
      evaluation = evaluateSupabaseProviderResilience({
        projectRef,
        projects: projectsResult.body,
        organization: organizationResult.body,
        backups: backupsResult.body,
      });
      blockerCodes.push(...evaluation.blockerCodes);
    }
  }

  const checks = {
    managementTokenConfigured: tokenConfigured,
    projectRefDerivedFromCanonicalSupabaseUrl: projectRefDerived,
    projectInventoryReachable: projectsResult.reachable === true,
    organizationControlPlaneReachable: organizationResult.reachable === true,
    backupInventoryReachable: backupsResult.reachable === true,
    ...(evaluation?.checks ?? {
      projectIdentityMatched: false,
      projectHealthy: false,
      organizationBindingPresent: false,
      organizationPlanObserved: false,
      productionEligiblePlan: false,
      backupCapabilityObserved: false,
      managedBackupObserved: false,
      pitrStateObserved: false,
    }),
  };
  const uniqueBlockers = [...new Set(blockerCodes)];
  const passed = Object.entries(checks)
    .filter(([name]) => name !== 'pitrStateObserved')
    .every(([, value]) => value === true)
    && uniqueBlockers.every((code) => code !== 'supabase_plan_not_production_eligible' && code !== 'supabase_managed_backup_not_observed');

  return {
    schema: 'risck-comply.supabase-provider-resilience.v1',
    evidenceItem: 'supabase-provider-resilience',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'blocked',
    generatedAt,
    targetSha: /^[a-f0-9]{40}$/.test(String(targetSha ?? '').toLowerCase()) ? String(targetSha).toLowerCase() : null,
    checks,
    metrics: evaluation?.metrics ?? {
      completedManagedBackupsObserved: 0,
      pitrEnabled: false,
    },
    blockerCodes: uniqueBlockers,
    evidenceIntegrity: {
      containsSensitiveValues: false,
      accessTokenStored: false,
      publicSupabaseUrlStored: false,
      projectRefStored: false,
      organizationSlugStored: false,
      organizationPlanStored: false,
      providerResponseBodiesStored: false,
      backupIdentifiersStored: false,
      rowDataStored: false,
    },
    evidenceBoundary: 'Records only booleans, a completed-backup count, PITR enabled state, exact-SHA binding and redacted blocker codes. It does not store the Management API token, project URL/ref, organization identity/plan value, backup identifiers or provider response bodies.',
  };
}

async function main() {
  const evidence = await buildSupabaseProviderResilienceEvidence();
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(`Supabase provider resilience: ${evidence.status}/${evidence.outcome}`);
  for (const code of evidence.blockerCodes) console.error(`- ${code}`);
  if (evidence.outcome !== 'passed') process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
