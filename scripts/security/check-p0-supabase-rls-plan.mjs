#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const planPath = process.argv[2] || path.join('docs', 'security', 'evidence', 'templates', 'supabase-live-rls-plan.template.json');
const placeholderPattern = /REPLACE_|YYYY-MM-DD|placeholder|TODO/i;
const requiredCases = new Set([
  'rls-cross-tenant-read-denied',
  'rls-cross-tenant-write-denied',
  'rls-same-tenant-allowed',
  'rls-service-role-review',
]);

function fail(message) {
  console.error(`Supabase RLS plan check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(planPath)) {
  fail(`missing plan file: ${planPath}`);
}

let plan;
try {
  plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
} catch (error) {
  fail(`invalid JSON in ${planPath}: ${error.message}`);
}

if (planPath.includes('/runtime/') && placeholderPattern.test(JSON.stringify(plan))) {
  fail('runtime plan must not contain placeholders');
}

if (plan.planId !== 'supabase-live-rls-validation-plan') {
  fail('planId must be supabase-live-rls-validation-plan');
}

if (!Array.isArray(plan.requiredTestCases)) {
  fail('requiredTestCases must be an array');
}

for (const requiredCase of requiredCases) {
  if (!plan.requiredTestCases.includes(requiredCase)) {
    fail(`missing required test case ${requiredCase}`);
  }
}

if (!Array.isArray(plan.tables) || plan.tables.length === 0) {
  fail('tables must include at least one table entry');
}

for (const table of plan.tables) {
  if (!table.table || !table.tenantBoundaryColumn || !Array.isArray(table.expectedCoverage)) {
    fail('each table must include table, tenantBoundaryColumn, and expectedCoverage');
  }

  for (const expected of ['cross-tenant-read-denied', 'same-tenant-allowed']) {
    if (!table.expectedCoverage.includes(expected)) {
      fail(`${table.table} missing expected coverage ${expected}`);
    }
  }
}

if (!Array.isArray(plan.serviceRolePathsReviewed)) {
  fail('serviceRolePathsReviewed must be an array');
}

if (plan.evidenceOutputTarget !== 'docs/security/evidence/runtime/supabase-live-rls-validation.json') {
  fail('evidenceOutputTarget must point to the Supabase RLS runtime evidence JSON');
}

console.log(`Supabase RLS validation plan is valid: ${planPath}`);
