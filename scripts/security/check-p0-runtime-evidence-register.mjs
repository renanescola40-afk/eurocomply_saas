import { existsSync, readFileSync } from 'node:fs';

const registerPath = 'docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md';
const evidenceTemplatePath = '.github/ISSUE_TEMPLATE/p0-runtime-evidence.yml';
const productionSecretsEvidencePath = 'docs/security/evidence/runtime/production-secrets-provider-stores.json';
const supabaseEvidencePath = 'docs/security/evidence/runtime/supabase-live-rls-validation.json';
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
  'compliance_tasks',
  'subscriptions',
  'notifications',
];
const requiredSupabaseOperations = [
  'cross_tenant_read',
  'cross_tenant_insert',
  'cross_tenant_update',
  'cross_tenant_delete',
  'same_tenant_read',
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

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    failures.push(`${path} is not valid JSON: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

function checkProductionSecretEvidence(registerRow) {
  if (!registerRow) return;

  if (!existsSync(productionSecretsEvidencePath)) {
    if (registerRow.status === 'Complete') {
      failures.push(`${registerPath} marks production secrets Complete but ${productionSecretsEvidencePath} is missing`);
    }
    return;
  }

  const evidence = readJson(productionSecretsEvidencePath);
  if (!evidence) return;

  if (registerRow.status === 'Complete' && evidence.status !== 'Complete') {
    failures.push(`${registerPath} marks production secrets Complete but ${productionSecretsEvidencePath} status is not Complete`);
  }

  if (evidence.status === 'Complete') {
    for (const field of requiredProductionSecretEvidenceFields) {
      if (!(field in evidence)) failures.push(`${productionSecretsEvidencePath} missing required field: ${field}`);
    }

    if (evidence.valuesRedacted !== true) {
      failures.push(`${productionSecretsEvidencePath} must set valuesRedacted to true`);
    }

    if (!Array.isArray(evidence.provider) || evidence.provider.length === 0) {
      failures.push(`${productionSecretsEvidencePath} must list provider stores checked`);
    }

    if (!Array.isArray(evidence.environmentsChecked) || !evidence.environmentsChecked.includes('production')) {
      failures.push(`${productionSecretsEvidencePath} must include production in environmentsChecked`);
    }

    if (!Array.isArray(evidence.variableNamesChecked)) {
      failures.push(`${productionSecretsEvidencePath} variableNamesChecked must be an array`);
    } else {
      const checkedVariables = new Set(evidence.variableNamesChecked);
      for (const variable of requiredProductionSecretVariables) {
        if (!checkedVariables.has(variable)) {
          failures.push(`${productionSecretsEvidencePath} missing checked production variable: ${variable}`);
        }
      }
    }

    if (!String(evidence.reviewer ?? '').trim()) {
      failures.push(`${productionSecretsEvidencePath} missing reviewer`);
    }

    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(String(evidence.timestamp ?? ''))) {
      failures.push(`${productionSecretsEvidencePath} timestamp must be UTC ISO-8601 seconds`);
    }

    if (!/^[a-f0-9]{40}$/i.test(String(evidence.commitSha ?? ''))) {
      failures.push(`${productionSecretsEvidencePath} commitSha must be a full 40-character commit SHA`);
    }

    if (!String(evidence.note ?? '').toLowerCase().includes('privately')) {
      failures.push(`${productionSecretsEvidencePath} must state value-bearing screenshots/exports are stored privately outside the repo`);
    }
  }
}

function checkSupabaseEvidence(registerRow) {
  if (!registerRow) return;

  if (!existsSync(supabaseEvidencePath)) {
    failures.push(`${supabaseEvidencePath} is missing`);
    return;
  }

  const evidence = readJson(supabaseEvidencePath);
  if (!evidence) return;

  const registerWantsComplete = registerRow.status === 'Complete';
  const evidenceIsComplete = evidence.status === 'Complete' && evidence.outcome === 'passed';

  if (registerWantsComplete && !evidenceIsComplete) {
    failures.push(`${registerPath} marks Supabase live RLS Complete without passing live evidence in ${supabaseEvidencePath}`);
  }

  if (evidence.status === 'Complete') {
    const tests = Array.isArray(evidence.testCases) ? evidence.testCases : [];
    const failedTests = tests.filter((test) => test?.passed !== true);
    const tables = new Set(tests.map((test) => test?.table).filter(Boolean));
    const operations = new Set(tests.map((test) => test?.operation).filter(Boolean));

    if (evidence.outcome !== 'passed') {
      failures.push(`${supabaseEvidencePath} status Complete requires outcome passed`);
    }

    if (failedTests.length > 0) {
      failures.push(`${supabaseEvidencePath} contains failing Supabase RLS test cases`);
    }

    for (const table of requiredSupabaseTables) {
      if (!tables.has(table)) failures.push(`${supabaseEvidencePath} missing live RLS coverage for table: ${table}`);
    }

    for (const operation of requiredSupabaseOperations) {
      if (!operations.has(operation)) failures.push(`${supabaseEvidencePath} missing live RLS operation: ${operation}`);
    }

    if (!String(evidence.redactionConfirmation ?? '').includes('redacted')) {
      failures.push(`${supabaseEvidencePath} missing redaction confirmation`);
    }

    if (!String(evidence.productionGate ?? '').toLowerCase().includes('production')) {
      failures.push(`${supabaseEvidencePath} missing production gate statement`);
    }
  }

  if (evidence.status === 'Open' && registerWantsComplete) {
    failures.push(`${registerPath} cannot be Complete while ${supabaseEvidencePath} remains Open`);
  }
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
    if (!rowByItem.has(item)) {
      failures.push(`${registerPath} missing required evidence item: ${item}`);
    }
  }

  for (const row of rows) {
    if (!allowedStatuses.has(row.status)) {
      failures.push(`${registerPath} invalid status for ${row.item}: ${row.status}`);
    }

    if (!row.evidence || row.evidence.length < 12) {
      failures.push(`${registerPath} missing useful evidence requirement for ${row.item}`);
    }

    if (!row.owner || row.owner.length < 5) {
      failures.push(`${registerPath} missing owner for ${row.item}`);
    }

    if (row.status === 'Complete' && !/(evidence|screenshot|export|output|report|review|commit|settings|artifact|link|json)/i.test(row.evidence)) {
      failures.push(`${registerPath} Complete item must reference reviewable evidence: ${row.item}`);
    }

    if (row.status === 'Exception' && !/(exception|risk|owner|due|expiry|approval)/i.test(row.evidence)) {
      failures.push(`${registerPath} Exception item must reference risk acceptance evidence: ${row.item}`);
    }
  }
}

checkProductionSecretEvidence(productionSecretsRegisterRow);
checkSupabaseEvidence(supabaseRegisterRow);

if (!existsSync(evidenceTemplatePath)) {
  failures.push(`${evidenceTemplatePath} is missing`);
} else {
  const template = readFileSync(evidenceTemplatePath, 'utf8');
  for (const token of requiredTemplateTokens) {
    if (!template.includes(token)) {
      failures.push(`${evidenceTemplatePath} missing required template token: ${token}`);
    }
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
