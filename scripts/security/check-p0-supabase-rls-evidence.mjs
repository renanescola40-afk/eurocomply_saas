#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseEvidenceJson, validatePassingEvidence } from './run-supabase-live-tenant-isolation.mjs';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', 'supabase-live-rls-validation.json');
const userScopedTable = 'profiles';
const userScopedOperations = ['rls_enabled', 'cross_tenant_read', 'cross_tenant_insert', 'cross_tenant_update', 'cross_tenant_delete', 'same_tenant_read'];
const aiAssessmentsTable = 'ai_assessments';
const aiAssessmentsOperations = [
  'rls_enabled',
  'cross_tenant_read',
  'cross_tenant_insert',
  'cross_tenant_update',
  'cross_tenant_delete',
  'same_tenant_read',
  'same_tenant_insert',
  'admin_same_tenant_insert',
  'member_same_tenant_read',
  'member_same_tenant_insert_denied',
  'member_same_tenant_update_denied',
  'member_same_tenant_delete_denied',
  'viewer_same_tenant_read',
  'viewer_same_tenant_insert_denied',
  'viewer_same_tenant_update_denied',
  'viewer_same_tenant_delete_denied',
];

function fail(message) {
  console.error(`P0 Supabase RLS evidence check failed: ${message}`);
  process.exit(1);
}

function hasPassedTest(evidence, table, operation) {
  return Array.isArray(evidence?.testCases)
    && evidence.testCases.some((test) => test?.table === table && test?.operation === operation && test?.passed === true);
}

if (!fs.existsSync(evidencePath)) {
  fail(`${evidencePath} is missing. Enterprise release is blocked until live Complete/passed evidence exists.`);
}

const parsed = parseEvidenceJson(fs.readFileSync(evidencePath, 'utf8'));
if (parsed.errors.length > 0) fail(parsed.errors.join('; '));

const result = validatePassingEvidence(parsed.evidence);
if (!result.valid) fail(result.errors.join('; '));

for (const operation of userScopedOperations) {
  if (!hasPassedTest(parsed.evidence, userScopedTable, operation)) {
    fail(`missing live RLS user-scoped table coverage: ${userScopedTable}:${operation}`);
  }
}

if (!Array.isArray(parsed.evidence?.customerTenantTables) || !parsed.evidence.customerTenantTables.includes(aiAssessmentsTable)) {
  fail(`${aiAssessmentsTable} must be listed as a customer tenant table in live evidence`);
}

if (!Array.isArray(parsed.evidence?.criticalTables) || !parsed.evidence.criticalTables.includes(aiAssessmentsTable)) {
  fail(`${aiAssessmentsTable} must be listed as a critical table in live evidence`);
}

for (const operation of aiAssessmentsOperations) {
  if (!hasPassedTest(parsed.evidence, aiAssessmentsTable, operation)) {
    fail(`missing live RLS ai_assessments coverage: ${aiAssessmentsTable}:${operation}`);
  }
}

if (parsed.evidence?.aiAssessmentsLiveValidation?.status !== 'Complete' || parsed.evidence?.aiAssessmentsLiveValidation?.outcome !== 'passed') {
  fail('aiAssessmentsLiveValidation must be Complete/passed');
}

console.log('P0 Supabase live RLS evidence is Complete/passed and machine-validated, including profiles and ai_assessments tenant isolation.');
