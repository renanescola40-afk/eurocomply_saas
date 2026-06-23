#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseEvidenceJson, validatePassingEvidence } from './run-supabase-live-tenant-isolation.mjs';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', 'supabase-live-rls-validation.json');
const userScopedTable = 'profiles';
const userScopedOperations = ['rls_enabled', 'cross_tenant_read', 'cross_tenant_insert', 'cross_tenant_update', 'cross_tenant_delete', 'same_tenant_read'];

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

console.log('P0 Supabase live RLS evidence is Complete/passed and machine-validated, including profiles user-scoped isolation.');
