#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  databaseUrlUsesPort,
  isLoopbackDatabaseUrl,
} from '../recovery/manage-ephemeral-recovery-database.mjs';

const FULL_SHA = /^[a-f0-9]{40}$/;
const repository = process.env.GITHUB_REPOSITORY || '';
const targetSha = String(process.env.TARGET_SHA || '').toLowerCase();
const databaseUrl = process.env.DATABASE_URL || '';
const recoveryHostPort = Number(process.env.RECOVERY_LOCAL_DB_HOST_PORT || '');
const migrationHistoryCanonical = String(process.env.RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL || '').toLowerCase();
const output = resolve(process.env.ENTERPRISE_DB_PROOF_OUTPUT || 'artifacts/enterprise-db-proof/isolated-enterprise-fria-db-proof.json');
const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';

function fail(message) {
  throw new Error(message);
}

if (repository !== CANONICAL_REPOSITORY) fail('repository must be canonical');
if (!FULL_SHA.test(targetSha)) fail('TARGET_SHA must be a lowercase full Git SHA');
if (!Number.isInteger(recoveryHostPort) || recoveryHostPort <= 0 || recoveryHostPort > 65535) {
  fail('RECOVERY_LOCAL_DB_HOST_PORT must be a valid isolated database port');
}
if (!isLoopbackDatabaseUrl(databaseUrl) || !databaseUrlUsesPort(databaseUrl, recoveryHostPort)) {
  fail('DATABASE_URL must point to the managed isolated loopback PostgreSQL port');
}
if (migrationHistoryCanonical !== 'false') {
  fail('RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL must be false for the reviewed disposable schema-effect proof');
}

const requiredTables = [
  'enterprise_contracts',
  'organization_entitlements',
  'enterprise_seat_operations',
  'ai_fria_assessments',
  'ai_fria_evidence',
  'ai_fria_decisions',
];

const sql = String.raw`
WITH required(name) AS (
  SELECT unnest(ARRAY[
    'enterprise_contracts',
    'organization_entitlements',
    'enterprise_seat_operations',
    'ai_fria_assessments',
    'ai_fria_evidence',
    'ai_fria_decisions'
  ]::text[])
), table_state AS (
  SELECT r.name,
         c.oid IS NOT NULL AS exists,
         COALESCE(c.relrowsecurity, false) AS rls_enabled,
         COALESCE(c.relforcerowsecurity, false) AS force_rls
  FROM required r
  LEFT JOIN pg_class c ON c.relname = r.name AND c.relnamespace = 'public'::regnamespace
), function_state AS (
  SELECT p.proname,
         pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND (
      pg_get_functiondef(p.oid) ILIKE '%enterprise_seat_operations%'
      OR pg_get_functiondef(p.oid) ILIKE '%ai_fria_assessments%'
    )
), policy_state AS (
  SELECT tablename, count(*)::int AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename IN (SELECT name FROM required)
  GROUP BY tablename
), grant_state AS (
  SELECT table_name, grantee, privilege_type
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name IN (SELECT name FROM required)
    AND grantee IN ('anon', 'authenticated')
    AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
)
SELECT json_build_object(
  'tables', COALESCE((SELECT json_agg(json_build_object(
    'name', t.name,
    'exists', t.exists,
    'rlsEnabled', t.rls_enabled,
    'forceRls', t.force_rls,
    'policyCount', COALESCE(p.policy_count, 0)
  ) ORDER BY t.name) FROM table_state t LEFT JOIN policy_state p ON p.tablename = t.name), '[]'::json),
  'functions', COALESCE((SELECT json_agg(json_build_object(
    'name', proname,
    'hasFixedSearchPath', definition ~* 'SET[[:space:]]+search_path',
    'hasSerialization', definition ~* 'FOR[[:space:]]+UPDATE|pg_advisory_xact_lock',
    'hasTenantScope', definition ~* 'organization_id'
  ) ORDER BY proname) FROM function_state), '[]'::json),
  'unsafeDirectGrants', COALESCE((SELECT json_agg(json_build_object(
    'table', table_name,
    'role', grantee,
    'privilege', privilege_type
  ) ORDER BY table_name, grantee, privilege_type) FROM grant_state), '[]'::json)
)::text;
`;

const stdout = execFileSync('psql', [databaseUrl, '--no-psqlrc', '--set=ON_ERROR_STOP=on', '--tuples-only', '--no-align', '--quiet', '-c', sql], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  maxBuffer: 4 * 1024 * 1024,
}).trim();

const snapshot = JSON.parse(stdout);
const tables = Array.isArray(snapshot.tables) ? snapshot.tables : [];
const functions = Array.isArray(snapshot.functions) ? snapshot.functions : [];
const unsafeDirectGrants = Array.isArray(snapshot.unsafeDirectGrants) ? snapshot.unsafeDirectGrants : [];
const failures = [];

for (const tableName of requiredTables) {
  const table = tables.find((entry) => entry?.name === tableName);
  if (!table?.exists) failures.push(`${tableName}:missing`);
  if (!table?.rlsEnabled) failures.push(`${tableName}:rls_disabled`);
  if (!table?.forceRls) failures.push(`${tableName}:force_rls_disabled`);
}
if (functions.length === 0) failures.push('critical_functions:missing');
if (!functions.some((entry) => entry.hasSerialization === true)) failures.push('seat_serialization:missing');
if (functions.some((entry) => entry.hasFixedSearchPath !== true)) failures.push('function_search_path:unsafe');
if (functions.some((entry) => entry.hasTenantScope !== true)) failures.push('function_tenant_scope:missing');
if (unsafeDirectGrants.length > 0) failures.push('unsafe_direct_mutation_grants:present');

const generatedAt = new Date().toISOString();
const reportBase = {
  schema: 'risck-comply.isolated-enterprise-fria-db-proof.v1',
  generatedAt,
  repository,
  targetSha,
  status: failures.length === 0 ? 'Complete' : 'Blocked',
  outcome: failures.length === 0 ? 'passed' : 'failed',
  decision: failures.length === 0 ? 'ISOLATED_DB_PROOF_COMPLETE' : 'NO_GO',
  checks: {
    schemaEffectsReplayed: true,
    migrationHistoryCanonical: false,
    isolatedLocalDatabase: true,
    requiredTablesPresent: !failures.some((item) => item.endsWith(':missing')),
    forcedRlsPresent: !failures.some((item) => item.includes('rls_disabled')),
    serializedSeatAuthorityPresent: !failures.includes('seat_serialization:missing'),
    fixedFunctionSearchPath: !failures.includes('function_search_path:unsafe'),
    tenantScopePresent: !failures.includes('function_tenant_scope:missing'),
    unsafeDirectMutationGrantsAbsent: unsafeDirectGrants.length === 0,
  },
  inventory: {
    tableCount: tables.length,
    functionCount: functions.length,
    unsafeDirectGrantCount: unsafeDirectGrants.length,
  },
  failures,
  evidenceIntegrity: {
    containsSensitiveValues: false,
    credentialsStored: false,
    customerDataStored: false,
    databaseUrlStored: false,
    productionDataAccessed: false,
    exactShaBound: true,
  },
  evidenceBoundary: 'This proof validates reviewed schema-effect replay, schema authority, forced RLS, function hardening and direct-grant boundaries in an ephemeral local Supabase database. The disposable replay is explicitly noncanonical for migration history and does not prove production migration completion, migration-history reconciliation. It does not prove production capacity, external IdP conformance, Stripe behavior, legal review or customer evidence truth.',
};
const integrity = createHash('sha256').update(JSON.stringify(reportBase)).digest('hex');
const report = { ...reportBase, integrity: { sha256: integrity } };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ decision: report.decision, failures: report.failures.length, tables: tables.length, functions: functions.length }));
if (failures.length > 0) process.exitCode = 1;
