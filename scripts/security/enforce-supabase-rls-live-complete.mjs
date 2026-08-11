#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  backendOwnedTables,
  criticalTables,
  customerTenantTables,
  globalReferenceTables,
  requiredBackendWriteDenyOperations,
  requiredCoverageOperations,
  requiredGlobalReferenceOperations,
  requiredSameTenantReadOperations,
  requiredViewerAdminDenyOperations,
  runner,
  sameTenantWritableTables,
  validatePassingEvidence,
} from './supabase-live-rls-evidence.mjs';

const evidencePath = path.join('docs', 'security', 'evidence', 'runtime', 'supabase-live-rls-validation.json');
const expectedCommitSha = String(process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
const failures = [];

function fail(message) {
  failures.push(message);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${file} is missing or invalid JSON: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

function validateGithubActionsProvenance(evidence) {
  const provenance = evidence.githubActions;
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) {
    fail(`${evidencePath} missing githubActions provenance`);
    return;
  }

  if (provenance.generatedInGitHubActions !== true) {
    fail(`${evidencePath} must be stamped from GitHub Actions`);
  }

  for (const field of ['workflow', 'runId', 'runUrl', 'repository', 'commitSha', 'refName', 'actor', 'eventName', 'stampedAt']) {
    if (!provenance[field] || typeof provenance[field] !== 'string') {
      fail(`${evidencePath} githubActions.${field} is missing`);
    }
  }

  if (typeof provenance.runUrl === 'string' && !/\/actions\/runs\/[0-9]+$/.test(provenance.runUrl)) {
    fail(`${evidencePath} githubActions.runUrl must point to a GitHub Actions run`);
  }

  if (/^[0-9a-f]{40}$/.test(expectedCommitSha)) {
    const evidenceCommitSha = String(evidence.commitSha || '').trim().toLowerCase();
    const provenanceCommitSha = String(provenance.commitSha || '').trim().toLowerCase();
    if (evidenceCommitSha !== expectedCommitSha) {
      fail(`${evidencePath} commitSha must match release commit ${expectedCommitSha}`);
    }
    if (provenanceCommitSha !== expectedCommitSha) {
      fail(`${evidencePath} githubActions.commitSha must match release commit ${expectedCommitSha}`);
    }
  }
}

function hasPassed(testCases, table, operation) {
  return testCases.some((test) => test?.table === table && test?.operation === operation && test?.passed === true);
}

function hasAnyPassed(testCases, table, operations) {
  return operations.some((operation) => hasPassed(testCases, table, operation));
}

function validateScope(evidence) {
  const tables = Array.isArray(evidence.criticalTables) ? evidence.criticalTables : [];
  const expected = criticalTables.join(',');
  const actual = tables.join(',');
  if (actual !== expected) {
    fail(`${evidencePath} criticalTables must match the P0 live RLS proof scope: ${expected}`);
  }

  if (Array.isArray(evidence.customerTenantTables) && evidence.customerTenantTables.join(',') !== customerTenantTables.join(',')) {
    fail(`${evidencePath} customerTenantTables must match the P0 customer tenant scope`);
  }

  if (Array.isArray(evidence.globalReferenceTables) && evidence.globalReferenceTables.join(',') !== globalReferenceTables.join(',')) {
    fail(`${evidencePath} globalReferenceTables must match the P0 global reference scope`);
  }

  const testCases = Array.isArray(evidence.testCases) ? evidence.testCases : [];

  for (const table of customerTenantTables) {
    if (!hasPassed(testCases, table, 'rls_enabled')) fail(`${evidencePath} missing RLS enablement proof: ${table}`);
    for (const operation of requiredCoverageOperations) {
      if (!hasPassed(testCases, table, operation)) fail(`${evidencePath} missing tenant isolation proof: ${table}:${operation}`);
    }
    if (!hasAnyPassed(testCases, table, requiredSameTenantReadOperations)) {
      fail(`${evidencePath} missing same-tenant read proof: ${table}`);
    }
  }

  for (const table of sameTenantWritableTables) {
    if (!hasPassed(testCases, table, 'same_tenant_insert')) fail(`${evidencePath} missing same-tenant write proof: ${table}`);
  }

  for (const table of backendOwnedTables) {
    for (const operation of requiredBackendWriteDenyOperations) {
      if (!hasPassed(testCases, table, operation)) fail(`${evidencePath} missing backend-owned write denial proof: ${table}:${operation}`);
    }
  }

  for (const operation of requiredViewerAdminDenyOperations) {
    if (!hasPassed(testCases, 'organization_members', operation)) fail(`${evidencePath} missing member privilege denial proof: organization_members:${operation}`);
  }

  for (const table of globalReferenceTables) {
    for (const operation of requiredGlobalReferenceOperations) {
      if (!hasPassed(testCases, table, operation)) fail(`${evidencePath} missing global reference read-only proof: ${table}:${operation}`);
    }
  }
}

const evidence = readJson(evidencePath);

if (evidence) {
  const validation = validatePassingEvidence(evidence);
  if (!validation.valid) {
    for (const error of validation.errors) fail(`${evidencePath} ${error}`);
  }

  if (evidence.runner !== runner) fail(`${evidencePath} must be generated by the live RLS proof runner`);
  if (!String(evidence.productionGate ?? '').toLowerCase().includes('production')) fail(`${evidencePath} must include a production gate statement`);
  validateScope(evidence);
  validateGithubActionsProvenance(evidence);
}

if (failures.length > 0) {
  console.error('Supabase live RLS production gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('Public production and enterprise procurement remain blocked until a Complete/passed live RLS artifact for the exact release SHA is generated by the protected workflow and stamped with GitHub Actions provenance.');
  process.exit(1);
}

console.log('Supabase live RLS production gate passed for the expanded P0 tenant isolation proof scope.');