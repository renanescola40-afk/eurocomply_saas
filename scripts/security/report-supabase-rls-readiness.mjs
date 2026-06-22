#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', 'supabase-live-rls-validation.json');
const registerPath = path.join('docs', 'security', 'P0_RUNTIME_EVIDENCE_REGISTER.md');
const workflowPath = path.join('.github', 'workflows', 'supabase-live-rls-validation.yml');
const strictRunner = 'scripts/security/run-supabase-live-tenant-isolation.mjs';
const requiredTables = ['organizations', 'organization_members', 'documents', 'audit_events', 'risks', 'vendors', 'compliance_tasks', 'subscriptions', 'notifications'];
const requiredOperations = ['cross_tenant_read', 'cross_tenant_insert', 'cross_tenant_update', 'cross_tenant_delete', 'same_tenant_read'];

function fileExists(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

function readText(file) {
  return fileExists(file) ? fs.readFileSync(file, 'utf8') : '';
}

function readJson(file) {
  try {
    return JSON.parse(readText(file));
  } catch {
    return null;
  }
}

function registerRow() {
  return readText(registerPath)
    .split('\n')
    .find((line) => line.startsWith('| Supabase live RLS validation completed |')) ?? '';
}

function hasGithubActionsProvenance(evidence) {
  const source = evidence?.githubActions ?? evidence?.provenance?.githubActions;
  return Boolean(
    source
      && String(source.workflow ?? '').length > 0
      && String(source.runId ?? '').length > 0
      && String(source.runUrl ?? '').startsWith('https://github.com/')
      && String(source.commitSha ?? '').length >= 7
      && String(source.repository ?? '').includes('/')
  );
}

const evidence = readJson(evidencePath);
const row = registerRow();
const testCases = Array.isArray(evidence?.testCases) ? evidence.testCases : [];
const tables = new Set(testCases.map((test) => test?.table).filter(Boolean));
const operations = new Set(testCases.map((test) => test?.operation).filter(Boolean));
const allTestCasesPassed = testCases.length > 0 && testCases.every((test) => test?.passed === true);

const checks = [
  {
    id: 'workflow-present',
    weight: 8,
    passed: fileExists(workflowPath),
    missing: `Create ${workflowPath}`,
  },
  {
    id: 'strict-runner-present',
    weight: 8,
    passed: fileExists(strictRunner),
    missing: `Create ${strictRunner}`,
  },
  {
    id: 'register-row-present',
    weight: 8,
    passed: row.length > 0,
    missing: `Add Supabase live RLS validation row to ${registerPath}`,
  },
  {
    id: 'evidence-json-present',
    weight: 8,
    passed: Boolean(evidence),
    missing: `Create valid JSON at ${evidencePath}`,
  },
  {
    id: 'strict-runner-recorded',
    weight: 8,
    passed: evidence?.runner === strictRunner,
    missing: `Generate evidence with ${strictRunner}`,
  },
  {
    id: 'runtime-complete',
    weight: 15,
    passed: evidence?.status === 'Complete' && evidence?.outcome === 'passed',
    missing: 'Run live Supabase tenant-isolation validation until evidence is Complete/passed',
  },
  {
    id: 'test-cases-passing',
    weight: 5,
    passed: allTestCasesPassed,
    missing: 'Evidence must include at least one test case and every test case must have passed: true',
  },
  {
    id: 'register-complete',
    weight: 10,
    passed: row.includes('| Complete |'),
    missing: `Update ${registerPath} through the live validation workflow after a passing run`,
  },
  {
    id: 'table-coverage',
    weight: 12,
    passed: requiredTables.every((table) => tables.has(table)),
    missing: `Evidence must cover required tables: ${requiredTables.filter((table) => !tables.has(table)).join(', ') || 'none'}`,
  },
  {
    id: 'operation-coverage',
    weight: 12,
    passed: requiredOperations.every((operation) => operations.has(operation)),
    missing: `Evidence must cover required operations: ${requiredOperations.filter((operation) => !operations.has(operation)).join(', ') || 'none'}`,
  },
  {
    id: 'actions-provenance',
    weight: 11,
    passed: hasGithubActionsProvenance(evidence),
    missing: 'Stamp passing evidence with GitHub Actions workflow/run/commit provenance',
  },
];

const earned = checks.filter((check) => check.passed).reduce((sum, check) => sum + check.weight, 0);
const total = checks.reduce((sum, check) => sum + check.weight, 0);
const percent = Math.round((earned / total) * 100);
const missing = checks.filter((check) => !check.passed).map((check) => ({ id: check.id, weight: check.weight, nextStep: check.missing }));
const complete = checks.every((check) => check.passed);

const report = {
  generatedAt: new Date().toISOString(),
  scorePercent: percent,
  complete,
  status: complete ? 'ready' : 'blocked',
  evidencePath,
  registerPath,
  workflowPath,
  checks: checks.map(({ id, weight, passed }) => ({ id, weight, passed })),
  missing,
  finalSteps: complete ? [] : [
    'Apply all Supabase migrations to the target project.',
    'Configure GitHub Actions Supabase secrets for the target project.',
    'Run the Supabase Live RLS Validation workflow.',
    'Merge the generated Complete/passed evidence PR.',
  ],
};

console.log(JSON.stringify(report, null, 2));

if (process.argv.includes('--strict') && !complete) {
  process.exitCode = 1;
}
