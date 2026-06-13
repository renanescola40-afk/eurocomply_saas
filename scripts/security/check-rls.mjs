import { existsSync, readFileSync } from 'node:fs';

const requiredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = requiredUrl?.match(/^https:\/\/([^.]+)\.supabase\.co/i)?.[1];
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const rlsRunbookPath = 'docs/security/RLS_LIVE_VALIDATION_RUNBOOK.md';

const criticalTables = [
  'organizations',
  'organization_members',
  'subscriptions',
  'documents',
  'vendors',
  'audit_events',
  'notifications',
  'organization_invites',
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
  'SUPABASE_SERVICE_ROLE_KEY',
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
];

function explainSetup() {
  console.log('Supabase RLS security gate');
  console.log('--------------------------');
  console.log('This script validates RLS posture through the Supabase Management API when SUPABASE_ACCESS_TOKEN is available.');
  console.log('Required env for live check: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_ACCESS_TOKEN.');
  console.log('Recommended env for production app checks: SUPABASE_SERVICE_ROLE_KEY must exist but is never printed.');
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

async function runLiveCheck() {
  checkRunbook();

  if (!projectRef || !accessToken) {
    explainSetup();
    if (!requiredUrl) {
      console.warn('Skipping live RLS check: NEXT_PUBLIC_SUPABASE_URL is not configured.');
    }
    if (!accessToken) {
      console.warn('Skipping live RLS check: SUPABASE_ACCESS_TOKEN is not configured.');
    }
    if (!serviceRoleKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY is not configured; production APIs that require admin checks will fail.');
    }
    return;
  }

  const tablesPayload = await fetchJson(`https://api.supabase.com/v1/projects/${projectRef}/database/tables?schema=public`, accessToken);
  const policiesPayload = await fetchJson(`https://api.supabase.com/v1/projects/${projectRef}/database/policies?schema=public`, accessToken);
  const tables = normalizeTableRows(tablesPayload);
  const policies = normalizePolicyRows(policiesPayload);

  const publicTables = tables.filter((table) => getSchemaName(table) === 'public' || !getSchemaName(table));
  const tableNames = new Set(publicTables.map(getTableName).filter(Boolean));
  const missingTables = criticalTables.filter((table) => !tableNames.has(table));
  const missingRls = publicTables
    .filter((table) => criticalTables.includes(getTableName(table)))
    .filter((table) => !hasRlsEnabled(table))
    .map(getTableName);
  const policyTables = new Set(policies.map(getPolicyTableName).filter(Boolean));
  const missingPolicies = criticalTables.filter((table) => tableNames.has(table) && !policyTables.has(table));
  const permissivePolicies = policies
    .filter((policy) => criticalTables.includes(getPolicyTableName(policy)))
    .filter((policy) => unsafePolicyPatterns.some((pattern) => pattern.test(getPolicyDefinition(policy))))
    .map((policy) => `${getPolicyTableName(policy)}:${policy.policyname ?? policy.name ?? 'unnamed_policy'}`);

  if (missingTables.length > 0) {
    console.warn('Critical tables not found. This can be expected before migrations are applied:');
    for (const table of missingTables) console.warn(`- ${table}`);
  }

  if (missingRls.length > 0 || missingPolicies.length > 0 || permissivePolicies.length > 0) {
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
    process.exitCode = 1;
    return;
  }

  console.log('Supabase RLS security gate: ok');
}

runLiveCheck().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
