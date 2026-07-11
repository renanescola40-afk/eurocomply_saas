#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evidencePath = path.join(
  'docs',
  'security',
  'evidence',
  'runtime',
  'supabase-live-rls-validation.json',
);

export const requiredProfileOperations = [
  'rls_enabled',
  'cross_tenant_read',
  'cross_tenant_insert',
  'cross_tenant_update',
  'cross_tenant_delete',
  'same_tenant_read',
];

function readEvidence(sourcePath = evidencePath) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(
      `Profiles RLS proof is missing because ${sourcePath} does not exist. Run the live Supabase tenant-isolation validation first.`,
    );
  }

  let evidence;
  try {
    evidence = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Profiles RLS proof could not parse ${sourcePath}: ${error instanceof Error ? error.message : error}`,
    );
  }

  return evidence;
}

export function validateProfileProof(evidence) {
  const errors = [];

  if (evidence?.status !== 'Complete' || evidence?.outcome !== 'passed') {
    errors.push('live RLS evidence must be Complete/passed');
  }

  const testCases = Array.isArray(evidence?.testCases) ? evidence.testCases : [];
  const profileTests = testCases.filter((test) => test?.table === 'profiles');

  for (const operation of requiredProfileOperations) {
    const matching = profileTests.filter((test) => test?.operation === operation);
    if (matching.length !== 1) {
      errors.push(`profiles:${operation} must appear exactly once`);
      continue;
    }

    if (matching[0]?.passed !== true) {
      errors.push(`profiles:${operation} must pass`);
    }
  }

  const readDenied = profileTests.find((test) => test?.operation === 'cross_tenant_read');
  if (readDenied && Number(readDenied.returnedRows ?? 0) !== 0) {
    errors.push('profiles:cross_tenant_read must return zero rows');
  }

  const insertDenied = profileTests.find((test) => test?.operation === 'cross_tenant_insert');
  if (insertDenied && insertDenied.denialMode !== 'rls_or_permission_error') {
    errors.push('profiles:cross_tenant_insert must be denied by RLS or database permissions');
  }

  const ownRead = profileTests.find((test) => test?.operation === 'same_tenant_read');
  if (ownRead && Number(ownRead.returnedRows ?? 0) !== 1) {
    errors.push('profiles:same_tenant_read must return exactly one own-profile row');
  }

  const coverage = Array.isArray(evidence?.tablesReviewed)
    ? evidence.tablesReviewed.find((entry) => entry?.table === 'profiles')
    : null;

  if (!coverage || coverage.status !== 'passed' || coverage.rlsEnabled !== true) {
    errors.push('tablesReviewed must record profiles as passed with RLS enabled');
  }

  return {
    valid: errors.length === 0,
    errors,
    operationsVerified: requiredProfileOperations,
  };
}

export function assertProfileProof({ sourcePath = evidencePath, advisory = false } = {}) {
  if (advisory) {
    console.log('Profiles RLS proof check skipped in advisory mode; no runtime completion is claimed.');
    return { valid: true, advisory: true, operationsVerified: [] };
  }

  const evidence = readEvidence(sourcePath);
  const result = validateProfileProof(evidence);

  if (!result.valid) {
    throw new Error(`Profiles live RLS proof failed: ${result.errors.join('; ')}`);
  }

  console.log(
    `Profiles live RLS proof passed: ${result.operationsVerified.join(', ')}.`,
  );
  return result;
}

const isCli =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  try {
    assertProfileProof({ advisory: process.argv.includes('--advisory') });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
