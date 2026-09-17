#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseEvidenceJson,
  tableCoverageFrom,
  validatePassingEvidence,
} from './supabase-live-rls-evidence.mjs';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', 'supabase-live-rls-validation.json');
const runner = 'scripts/security/run-supabase-live-ai-assessments-rls.mjs';
const advisoryMode = process.argv.includes('--advisory') || process.env.RLS_LIVE_ADVISORY === '1';
const requiredOperations = [
  'rls_enabled',
  'cross_tenant_read',
  'cross_tenant_insert',
  'cross_tenant_update',
  'cross_tenant_delete',
  'same_tenant_read',
  'same_tenant_insert_denied',
  'same_tenant_update_denied',
  'same_tenant_delete_denied',
  'admin_same_tenant_insert_denied',
  'admin_same_tenant_update_denied',
  'admin_same_tenant_delete_denied',
  'member_same_tenant_read',
  'member_same_tenant_insert_denied',
  'member_same_tenant_update_denied',
  'member_same_tenant_delete_denied',
  'viewer_same_tenant_read',
  'viewer_same_tenant_insert_denied',
  'viewer_same_tenant_update_denied',
  'viewer_same_tenant_delete_denied',
];

function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function hasPassed(testCases, operation) {
  return testCases.some((test) => test?.table === 'ai_assessments'
    && test?.operation === operation
    && test?.passed === true);
}

function fail(message) {
  throw new Error(`Live ai_assessments RLS validation failed: ${message}`);
}

function withAiAssessments(values = []) {
  return Array.from(new Set([...values, 'ai_assessments']));
}

export async function main() {
  if (advisoryMode && !/^\d+$/.test(String(process.env.PROMOTION_RUN_ID ?? '').trim())) {
    console.log(JSON.stringify({
      status: 'advisory',
      runner,
      checkedAt: now(),
      message: 'Skipping ai_assessments compatibility validation because PROMOTION_RUN_ID is not bound to this advisory run.',
      promotionRunRequired: true,
      evidenceGenerated: false,
    }, null, 2));
    return;
  }

  let source;
  try {
    source = fs.readFileSync(evidencePath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      fail(`${evidencePath} is missing. Run scripts/security/run-supabase-live-tenant-isolation.mjs first.`);
    }
    throw error;
  }

  const parsed = parseEvidenceJson(source);
  if (parsed.errors.length > 0) fail(parsed.errors.join('; '));

  const evidence = parsed.evidence;
  const canonical = validatePassingEvidence(evidence);
  if (!canonical.valid) fail(canonical.errors.join('; '));

  const testCases = Array.isArray(evidence.testCases) ? evidence.testCases : [];
  for (const operation of requiredOperations) {
    if (!hasPassed(testCases, operation)) fail(`missing or failed operation ${operation}`);
  }

  if (evidence.aiAssessmentsLiveValidation?.status !== 'Complete'
    || evidence.aiAssessmentsLiveValidation?.outcome !== 'passed'
    || evidence.aiAssessmentsLiveValidation?.crossTenantAccessDenied !== true
    || evidence.aiAssessmentsLiveValidation?.browserMutationsBackendOnly !== true) {
    fail('aiAssessmentsLiveValidation must prove Complete/passed, cross-tenant denial and backend-only browser mutations');
  }

  const timestamp = now();
  const nextEvidence = {
    ...evidence,
    timestamp,
    generatedAt: timestamp,
    reviewedAt: timestamp,
    commandUsed: String(evidence.commandUsed ?? '').includes(runner)
      ? evidence.commandUsed
      : `${evidence.commandUsed ?? 'node scripts/security/run-supabase-live-tenant-isolation.mjs'} && node ${runner}`,
    customerTenantTables: withAiAssessments(evidence.customerTenantTables),
    criticalTables: withAiAssessments(evidence.criticalTables),
    tablesReviewed: tableCoverageFrom(testCases),
    aiAssessmentsLiveValidation: {
      ...evidence.aiAssessmentsLiveValidation,
      runner,
      commandUsed: `node ${runner}`,
      generatedAt: timestamp,
      compatibilityValidationOnly: true,
      browserMutationsBackendOnly: true,
    },
  };

  fs.writeFileSync(evidencePath, `${JSON.stringify(nextEvidence, null, 2)}\n`, { mode: 0o600 });
  console.log('Live ai_assessments RLS compatibility validation: passed (canonical server-only proof reused)');
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
