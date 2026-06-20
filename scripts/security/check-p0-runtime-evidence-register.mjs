#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const registerPath = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';
const evidenceTemplatePath = '.github/ISSUE_TEMPLATE/p0-runtime-evidence.yml';
const productionSecretsEvidencePath = 'docs/security/evidence/runtime/production-secrets-provider-stores.json';
const supabaseEvidencePath = 'docs/security/evidence/runtime/supabase-live-rls-validation.json';
const supabaseRunner = 'scripts/security/run-supabase-live-tenant-isolation.mjs';
const allowedStatuses = new Set(['Open', 'Complete', 'Exception']);
const requiredItems = [
  'Branch protection applied on `main`',
  'Required status checks configured',
  'Production secrets configured in provider secret stores',
  'Supabase live RLS validation completed',
  'External security review or pentest completed',
  'Deterministic npm lockfile committed',
  'Floating dependency specs removed',
];
const requiredTemplateTokens = [
  'P0 Runtime Evidence',
  'Evidence item',
  'Requested register status',
  'Evidence summary',
  'Evidence location',
  'Redaction confirmation',
  'Reviewer / owner',
  'Exception details',
];
const requiredSupabaseTables = [
  'organizations',
  'organization_members',
  'documents',
  'audit_events',
  'risks',
  'vendors',
  'tasks',
  'subscriptions',
  'notifications',
];
const requiredCrossTenantOperations = [
  'cross_tenant_read',
  'cross_tenant_insert',
  'cross_tenant_update',
  'cross_tenant_delete',
];
const requiredSameTenantInsertTables = ['documents', 'risks', 'vendors', 'tasks'];
const requiredBackendWriteDenyTables = ['audit_events', 'subscriptions'];
const requiredBackendWriteDenyOperations = [
  'same_tenant_insert_denied',
  'same_tenant_update_denied',
  'same_tenant_delete_denied',
];
const requiredSupabaseEvidenceFields = [
  'status',
  'outcome',
  'timestamp',
  'supabaseProjectReference',
  'supabaseProjectReferenceRedacted',
  'tablesReviewed',
  'testsRun',
  'failures',
  'reviewer',
  'commandUsed',
  'commitSha',
  'testCases',
];
const requiredProductionSecretEvidenceFields = [
  'status',
  'provider',
  'environmentsChecked',
  'variableNamesChecked',
  'valuesRedacted',
  'reviewer',
  'timestamp',
  'commitSha',
  'note',
];
const requiredProductionSecretVariables = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'HEALTHCHECK_TOKEN',
  'AUDIT_CHAIN_SIGNING_SECRET',
  'EVIDENCE_PACK_SIGNING_SECRET',
  'STEP_UP_SIGNING_SECRET',
  'CRON_SECRET',
  'INTERNAL_CRON_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
  'VERCEL_TOKEN',
  'VERCEL_ORG_ID',
  'VERCEL_PROJECT_ID',
];
const failures = [];

function parseRows(source) {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && !line.includes('---'))
    .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean))
    .filter((cells) => cells.length >= 4 && cells[0] !== 'Evidence item')
    .map(([item, status, evidence, owner]) => ({ item, status, evidence, owner }));
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    failures.push(`${filePath} is not valid JSON: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

function hasIsoSeconds(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(String(value ?? ''));
}

function hasFullSha(value) {
  return /^[a-f0-9]{40}$/i.test(String(value ?? ''));
}

function hasPassedTest(tests, table, operation) {
  return tests.some((test) => test?.table === table && test?.operation === operation && test?.passed === true);
}

function hasSameTenantReadTest(tests, table) {
  return tests.some((test) => test?.table === table && ['same_tenant_read', 'same_tenant_read_backend_only'].includes(test?.operation) && test?.passed === true);
}

function checkProductionSecretEvidence(registerRow) {
  if (!registerRow) return;
  if (!existsSync(productionSecretsEvidencePath)) {
    if (registerRow.status === 'Complete') failures.push(`${registerPath} marks production secrets Complete but ${productionSecretsEvidencePath} is missing`);
    return;
  }

  const evidence = readJson(productionSecretsEvidencePath);
  if (!evidence) return;
  if (registerRow.status === 'Complete' && evidence.status !== 'Complete') failures.push(`${registerPath} marks production secrets Complete but ${productionSecretsEvidencePath} status is not Complete`);
  if (evidence.status !== 'Complete') return;

  for (const field of requiredProductionSecretEvidenceFields) {
    if (!(field in evidence)) failures.push(`${productionSecretsEvidencePath} missing required field: ${field}`);
  }
  if (evidence.valuesRedacted !== true) failures.push(`${productionSecretsEvidencePath} must set valuesRedacted to true`);
  if (!Array.isArray(evidence.provider) || evidence.provider.length === 0) failures.push(`${productionSecretsEvidencePath} must list provider stores checked`);
  if (!Array.isArray(evidence.environmentsChecked) || !evidence.environmentsChecked.includes('production')) failures.push(`${productionSecretsEvidencePath} must include production in environmentsChecked`);
  if (!Array.isArray(evidence.variableNamesChecked)) {
    failures.push(`${productionSecretsEvidencePath} variableNamesChecked must be an array`);
  } else {
    const checkedVariables = new Set(evidence.variableNamesChecked);
    for (const variable of requiredProductionSecretVariables) {
      if (!checkedVariables.has(variable)) failures.push(`${productionSecretsEvidencePath} missing checked production variable: ${variable}`);
    }
  }
  if (!String(evidence.reviewer ?? '').trim()) failures.push(`${productionSecretsEvidencePath} missing reviewer`);
  if (!hasIsoSeconds(evidence.timestamp)) failures.push(`${productionSecretsEvidencePath} timestamp must be UTC ISO-8601 seconds`);
  if (!hasFullSha(evidence.commitSha)) failures.push(`${productionSecretsEvidencePath} commitSha must be a full 40-character commit SHA`);
  if (!String(evidence.note ?? '').toLowerCase().includes('privately')) failures.push(`${productionSecretsEvidencePath} must state value-bearing screenshots/exports are stored privately outside the repo`);
}

function checkSupabaseEvidence(registerRow) {
  if (!registerRow) return;
  if (!existsSync(supabaseEvidencePath)) {
    if (registerRow.status === 'Complete') failures.push(`${registerPath} marks Supabase live RLS Complete but ${supabaseEvidencePath} is missing`);
    return;
  }

  const evidence = readJson(supabaseEvidencePath);
  if (!evidence) return;
  const registerWantsComplete = registerRow.status === 'Complete';
  const evidenceIsComplete = evidence.status === 'Complete' && evidence.outcome === 'passed';

  if (registerWantsComplete && !evidenceIsComplete) failures.push(`${registerPath} marks Supabase live RLS Complete without passing live evidence in ${supabaseEvidencePath}`);
  if (evidence.status === 'Open' && registerWantsComplete) failures.push(`${registerPath} cannot be Complete while ${supabaseEvidencePath} remains Open`);
  if (evidence.status !== 'Complete') return;

  for (const field of requiredSupabaseEvidenceFields) {
    if (!(field in evidence)) failures.push(`${supabaseEvidencePath} missing required field: ${field}`);
  }
  if (evidence.outcome !== 'passed') failures.push(`${supabaseEvidencePath} status Complete requires outcome passed`);
  if (!hasIsoSeconds(evidence.timestamp)) failures.push(`${supabaseEvidencePath} timestamp must be UTC ISO-8601 seconds`);
  if (!hasFullSha(evidence.commitSha)) failures.push(`${supabaseEvidencePath} commitSha must be a full 40-character commit SHA`);
  if (!String(evidence.reviewer ?? '').trim()) failures.push(`${supabaseEvidencePath} missing reviewer`);
  if (!String(evidence.commandUsed ?? '').includes(supabaseRunner)) failures.push(`${supabaseEvidencePath} commandUsed must include ${supabaseRunner}`);
  if (evidence.supabaseProjectReferenceRedacted !== true) failures.push(`${supabaseEvidencePath} must set supabaseProjectReferenceRedacted to true`);
  if (!String(evidence.supabaseProjectReference ?? '').startsWith('redacted:')) failures.push(`${supabaseEvidencePath} must include only a redacted Supabase project reference`);

  const tests = Array.isArray(evidence.testCases) ? evidence.testCases : [];
  const failedTests = tests.filter((test) => test?.passed !== true);
  if (failedTests.length > 0) failures.push(`${supabaseEvidencePath} contains failing Supabase RLS test cases`);
  if (!Array.isArray(evidence.failures)) failures.push(`${supabaseEvidencePath} failures must be an array`);
  else if (evidence.failures.length > 0) failures.push(`${supabaseEvidencePath} Complete evidence must have zero failures`);
  if (!Array.isArray(evidence.testsRun) || evidence.testsRun.length !== tests.length) {
    failures.push(`${supabaseEvidencePath} testsRun must list every executed test case`);
  } else {
    const expected = tests.map((test) => `${test.table}:${test.operation}`);
    if (expected.some((name, index) => evidence.testsRun[index] !== name)) failures.push(`${supabaseEvidencePath} testsRun must match every executed test case in order`);
  }

  for (const table of requiredSupabaseTables) {
    if (!tests.some((test) => test?.table === table)) failures.push(`${supabaseEvidencePath} missing live RLS coverage for table: ${table}`);
    for (const operation of requiredCrossTenantOperations) {
      if (!hasPassedTest(tests, table, operation)) failures.push(`${supabaseEvidencePath} missing live RLS operation for table: ${table}:${operation}`);
    }
    if (!hasSameTenantReadTest(tests, table)) failures.push(`${supabaseEvidencePath} missing same-tenant read coverage for table: ${table}`);
  }

  for (const table of requiredSameTenantInsertTables) {
    if (!hasPassedTest(tests, table, 'same_tenant_insert')) failures.push(`${supabaseEvidencePath} missing same-tenant insert coverage for table: ${table}`);
  }
  for (const table of requiredBackendWriteDenyTables) {
    for (const operation of requiredBackendWriteDenyOperations) {
      if (!hasPassedTest(tests, table, operation)) failures.push(`${supabaseEvidencePath} missing backend-owned write-denial coverage for table: ${table}:${operation}`);
    }
  }

  if (!Array.isArray(evidence.tablesReviewed)) {
    failures.push(`${supabaseEvidencePath} tablesReviewed must be an array`);
  } else {
    for (const table of requiredSupabaseTables) {
      const reviewed = evidence.tablesReviewed.find((entry) => entry?.table === table);
      if (!reviewed) {
        failures.push(`${supabaseEvidencePath} tablesReviewed missing table: ${table}`);
      } else {
        if (reviewed.status !== 'passed') failures.push(`${supabaseEvidencePath} table did not pass: ${table}`);
        const operations = reviewed.operations ?? {};
        if (operations.crossTenantReadDenied !== true) failures.push(`${supabaseEvidencePath} tablesReviewed missing read denial for table: ${table}`);
        if (operations.crossTenantInsertDenied !== true) failures.push(`${supabaseEvidencePath} tablesReviewed missing insert denial for table: ${table}`);
        if (operations.crossTenantUpdateDenied !== true) failures.push(`${supabaseEvidencePath} tablesReviewed missing update denial for table: ${table}`);
        if (operations.crossTenantDeleteDenied !== true) failures.push(`${supabaseEvidencePath} tablesReviewed missing delete denial for table: ${table}`);
        if (operations.sameTenantReadAllowed !== true) failures.push(`${supabaseEvidencePath} tablesReviewed missing same-tenant read allowance for table: ${table}`);
      }
    }
  }

  if (!String(evidence.redactionConfirmation ?? '').toLowerCase().includes('redacted')) failures.push(`${supabaseEvidencePath} missing redaction confirmation`);
  if (!String(evidence.productionGate ?? '').toLowerCase().includes('production')) failures.push(`${supabaseEvidencePath} missing production gate statement`);
}

let productionSecretsRegisterRow = null;
let supabaseRegisterRow = null;

if (!existsSync(registerPath)) {
  failures.push(`${registerPath} is missing`);
} else {
  const source = readFileSync(registerPath, 'utf8');
  const rows = parseRows(source);
  const rowByItem = new Map(rows.map((row) => [row.item, row]));
  productionSecretsRegisterRow = rowByItem.get('Production secrets configured in provider secret stores') ?? null;
  supabaseRegisterRow = rowByItem.get('Supabase live RLS validation completed') ?? null;

  for (const item of requiredItems) {
    if (!rowByItem.has(item)) failures.push(`${registerPath} missing required evidence item: ${item}`);
  }
  for (const row of rows) {
    if (!allowedStatuses.has(row.status)) failures.push(`${registerPath} invalid status for ${row.item}: ${row.status}`);
    if (!row.evidence || row.evidence.length < 12) failures.push(`${registerPath} missing useful evidence requirement for ${row.item}`);
    if (!row.owner || row.owner.length < 5) failures.push(`${registerPath} missing owner for ${row.item}`);
    if (row.status === 'Complete' && !/(evidence|screenshot|export|output|report|review|commit|settings|artifact|link|json)/i.test(row.evidence)) failures.push(`${registerPath} Complete item must reference reviewable evidence: ${row.item}`);
    if (row.status === 'Exception' && !/(exception|risk|owner|due|expiry|approval)/i.test(row.evidence)) failures.push(`${registerPath} Exception item must reference risk acceptance evidence: ${row.item}`);
  }
}

checkProductionSecretEvidence(productionSecretsRegisterRow);
checkSupabaseEvidence(supabaseRegisterRow);

if (!existsSync(evidenceTemplatePath)) {
  failures.push(`${evidenceTemplatePath} is missing`);
} else {
  const template = readFileSync(evidenceTemplatePath, 'utf8');
  for (const token of requiredTemplateTokens) {
    if (!template.includes(token)) failures.push(`${evidenceTemplatePath} missing required template token: ${token}`);
  }
}

console.log('EuroComply P0 runtime evidence register check');
console.log('------------------------------------------------');

if (failures.length > 0) {
  console.error('P0 runtime evidence register failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('P0 runtime evidence register: ok');
}
