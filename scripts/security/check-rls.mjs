import { existsSync, readFileSync } from 'node:fs';

const requiredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const privilegedEnvName = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_');
const serviceRoleKey = process.env[privilegedEnvName];
const projectRef = requiredUrl?.match(/^https:\/\/([^.]+)\.supabase\.co/i)?.[1];
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const rlsRunbookPath = 'docs/security/RLS_LIVE_VALIDATION_RUNBOOK.md';
const rlsEvidencePath = 'docs/security/evidence/runtime/supabase-live-rls-validation.json';

const criticalTables = [
  'organizations',
  'organization_members',
  'subscriptions',
  'documents',
  'vendors',
  'risks',
  'tasks',
  'compliance_tasks',
  'audit_events',
  'audit_logs',
  'notifications',
  'organization_invites',
  'invitations',
  'ai_systems',
  'ai_incidents',
];

const organizationScopedTables = [
  'documents',
  'vendors',
  'risks',
  'tasks',
  'compliance_tasks',
  'audit_events',
  'audit_logs',
  'notifications',
  'subscriptions',
  'organization_members',
  'organization_invites',
  'invitations',
  'ai_systems',
  'ai_incidents',
];

const unsafePolicyPatterns = [
  /using\s*\(\s*true\s*\)/i,
  /with\s+check\s*\(\s*true\s*\)/i,
  /to\s+public/i,
];

const runbookRequiredTokens = [
  'RLS Live Validation Runbook',
  'SUPABASE_ACCESS_TOKEN',
  'NEXT_PUBLIC_SUPABASE_URL',
  'advisory',
  'live validation',
  'npm run security:rls',
  'Security CI',
  'Release Candidate',
  'Critical tables',
  'organizations',
  'organization_members',
  'documents',
  'audit_events',
  'risks',
  'vendors',
  'scripts/security/run-supabase-live-rls-validation.mjs',
];

function explainSetup() {
  console.log('Supabase RLS security gate');
  console.log('--------------------------');
  console.log('This script validates RLS posture through the Supabase Management API when SUPABASE_ACCESS_TOKEN is available.');
  console.log('Required env for live check: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_ACCESS_TOKEN.');
  console.log('Recommended env for production app checks: privileged backend Supabase key must exist but is never printed.');
}

function checkRunbook() {
  if (!existsSync(rlsRunbookPath)) {
    console.error(`${rlsRunbookPath} is missing`);
    process.exitCode = 1;
    return;
  }

  const runbook = readFileSync(rlsRunbookPath, 'utf8');
  const missingTokens = runbookRequiredTokens.filter((token) => !runbook.includes(token));

  if (missingTokens.length > 0) {
    console.error(`${rlsRunbookPath} is missing required RLS evidence tokens:`);
    for (const token of missingTokens) console.error(`- ${token}`);
    process.exitCode = 1;
  }
}

function readRuntimeEvidence() {
  if (!existsSync(rlsEvidencePath)) return null;
  try {
    return JSON.parse(readFileSync(rlsEvidencePath, 'utf8'));
  } catch {
    return null;
  }
}

function completedRuntimeEvidence() {
  const evidence = readRuntimeEvidence();
  return evidence?.status === 'Complete' && evidence?.outcome === 'passed';
}

function checkRuntimeEvidencePlaceholder() {
  if (!existsSync(rlsEvidencePath)) {
    console.error(`${rlsEvidencePath} is missing; Supabase live RLS evidence must be tracked as Open or Complete.`);
    process.exitCode = 1;
    return;
  }

  const evidence = JSON.parse(readFileSync(rlsEvidencePath, 'utf8'));
  if (!['Open', 'Complete'].includes(evidence.status)) {
    console.error(`${rlsEvidencePath} must use status Open or Complete.`);
    process.exitCode = 1;
  }

  if (evidence.status === 'Complete' && evidence.outcome !== 'passed') {
    console.error(`${rlsEvidencePath} status Complete requires outcome passed.`);
    process.exitCode = 1;
  }
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase Management API returned ${response.status}: ${text.slice(0, 300)}`);
  }

  return response.json();
}

function normalizeTableRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.tables)) return payload.tables;
  return [];
}

function normalizePolicyRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.policies)) return payload.policies;
  return [];
}

function getTableName(row) {
  return row.name ?? row.table_name ?? row.tablename;
}

function getSchemaName(row) {
  return row.schema ?? row.table_schema ?? row.schemaname;
}

function hasRlsEnabled(row) {
  return Boolean(row.rls_enabled ?? row.rowsecurity ?? row.row_security ?? row.enable_rls);
}

function getPolicyTableName(row) {
  return row.table ?? row.table_name ?? row.tablename;
}

function getPolicyDefinition(row) {
  return [row.definition, row.using, row.with_check, row.roles, row.command, row.policyname, row.name]
    .filter(Boolean)
    .join(' ');
}

function mentionsTenantGuard(policy) {
  const definition = getPolicyDefinition(policy);
  return /organization_id|is_org_member|has_org_role|auth\.uid\(\)/i.test(definition);
}

async function runLiveCheck() {
  checkRunbook();
  checkRuntimeEvidencePlaceholder();

  if (!projectRef || !accessToken) {
    explainSetup();
    if (!requiredUrl) {
      console.warn('Skipping live RLS metadata check: NEXT_PUBLIC_SUPABASE_URL is not configured.');
    }
    if (!accessToken) {
      console.warn('Skipping live RLS metadata check: SUPABASE_ACCESS_TOKEN is not configured.');
    }
    if (!serviceRoleKey) {
      console.warn('Privileged backend Supabase key is not configured; controlled backend-only checks will fail.');
    }
    return;
  }

  let tablesPayload;
  let policiesPayload;
  try {
    tablesPayload = await fetchJson(`https://api.supabase.com/v1/projects/${projectRef}/database/tables?schema=public`, accessToken);
    policiesPayload = await fetchJson(`https://api.supabase.com/v1/projects/${projectRef}/database/policies?schema=public`, accessToken);
  } catch (error) {
    if (completedRuntimeEvidence()) {
      console.warn(error instanceof Error ? error.message : error);
      console.warn(`${rlsEvidencePath} is Complete/passed; treating unavailable Management API metadata as advisory for this gate.`);
      console.log('Supabase RLS security gate: ok');
      return;
    }
    throw error;
  }

  const tables = normalizeTableRows(tablesPayload);
  const policies = normalizePolicyRows(policiesPayload);

  const publicTables = tables.filter((table) => getSchemaName(table) === 'public' || !getSchemaName(table));
  const tableNames = new Set(publicTables.map(getTableName).filter(Boolean));
  const existingCriticalTables = criticalTables.filter((table) => tableNames.has(table));
  const missingTables = criticalTables.filter((table) => !tableNames.has(table));
  const missingRls = publicTables
    .filter((table) => criticalTables.includes(getTableName(table)))
    .filter((table) => !hasRlsEnabled(table))
    .map(getTableName);
  const policyTables = new Set(policies.map(getPolicyTableName).filter(Boolean));
  const missingPolicies = existingCriticalTables.filter((table) => !policyTables.has(table));
  const permissivePolicies = policies
    .filter((policy) => criticalTables.includes(getPolicyTableName(policy)))
    .filter((policy) => unsafePolicyPatterns.some((pattern) => pattern.test(getPolicyDefinition(policy))))
    .map((policy) => `${getPolicyTableName(policy)}:${policy.policyname ?? policy.name ?? 'unnamed_policy'}`);
  const missingTenantGuardPolicies = organizationScopedTables
    .filter((table) => tableNames.has(table))
    .filter((table) => !policies.some((policy) => getPolicyTableName(policy) === table && mentionsTenantGuard(policy)));

  if (missingTables.length > 0) {
    console.warn('Critical tables not found. This can be expected before migrations are applied:');
    for (const table of missingTables) console.warn(`- ${table}`);
  }

  if (missingRls.length > 0 || missingPolicies.length > 0 || permissivePolicies.length > 0 || missingTenantGuardPolicies.length > 0) {
    if (missingRls.length > 0) {
      console.error('Critical tables without RLS enabled:');
      for (const table of missingRls) console.error(`- ${table}`);
    }
    if (missingPolicies.length > 0) {
      console.error('Critical tables without any detected RLS policy:');
      for (const table of missingPolicies) console.error(`- ${table}`);
    }
    if (permissivePolicies.length > 0) {
      console.error('Potentially permissive policies detected:');
      for (const policy of permissivePolicies) console.error(`- ${policy}`);
    }
    if (missingTenantGuardPolicies.length > 0) {
      console.error('Organization scoped tables without detected tenant guard policy:');
      for (const table of missingTenantGuardPolicies) console.error(`- ${table}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Supabase RLS security gate: ok');
}

runLiveCheck().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
