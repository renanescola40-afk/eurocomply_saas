#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

import { p0EvidenceCatalog } from './p0-runtime-evidence-catalog.mjs';

const FULL_SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const DEFAULT_PATH = 'artifacts/p0-runtime-evidence-register/p0-runtime-evidence-register.json';

export function validateGeneratedP0Register(register, {
  expectedRepository = 'renanescola40-afk/eurocomply_saas',
  expectedBranch = 'main',
  expectedCommitSha,
} = {}) {
  const failures = [];
  if (!register || typeof register !== 'object' || Array.isArray(register)) return ['register_not_object'];
  if (register.schema !== 'risck-comply.p0-runtime-evidence-register.v1') failures.push('schema_invalid');
  if (register.repository !== expectedRepository) failures.push('repository_mismatch');
  if (register.branch !== expectedBranch) failures.push('branch_mismatch');
  if (!FULL_SHA.test(String(register.commitSha || ''))) failures.push('commit_sha_invalid');
  if (expectedCommitSha && String(register.commitSha || '') !== String(expectedCommitSha).toLowerCase()) {
    failures.push('commit_sha_mismatch');
  }
  if (!Number.isFinite(Date.parse(String(register.generatedAt || '')))) failures.push('generated_at_invalid');
  if (!Array.isArray(register.controls)) failures.push('controls_invalid');

  const controls = Array.isArray(register.controls) ? register.controls : [];
  const allowedItems = new Set(p0EvidenceCatalog.map((entry) => entry.item));
  const seen = new Set();
  for (const control of controls) {
    const item = String(control?.item || '');
    if (!allowedItems.has(item)) failures.push(`unknown_control:${item || 'empty'}`);
    if (seen.has(item)) failures.push(`duplicate_control:${item || 'empty'}`);
    seen.add(item);
    if (!['runtime', 'repository'].includes(control?.kind)) failures.push(`kind_invalid:${item}`);
    if (!['Complete', 'Open'].includes(control?.status)) failures.push(`status_invalid:${item}`);
    if (control?.satisfied !== (control?.status === 'Complete')) failures.push(`satisfied_status_mismatch:${item}`);
    if (!Array.isArray(control?.validatorFailures)) failures.push(`validator_failures_invalid:${item}`);
    if (control?.status === 'Complete' && control?.validatorFailures?.length > 0) failures.push(`complete_with_failures:${item}`);
    if (control?.status === 'Open' && control?.satisfied === true) failures.push(`open_but_satisfied:${item}`);
  }

  if (![15, 16].includes(controls.length)) failures.push('control_count_invalid');
  if (register.total !== controls.length) failures.push('total_mismatch');
  const completed = controls.filter((control) => control?.status === 'Complete').length;
  const blocked = controls.length - completed;
  if (register.completed !== completed) failures.push('completed_count_mismatch');
  if (register.blocked !== blocked) failures.push('blocked_count_mismatch');
  const percent = controls.length === 0 ? 0 : Math.round((completed / controls.length) * 100);
  if (register.completionPercent !== percent) failures.push('completion_percent_mismatch');
  const shouldGo = blocked === 0;
  if (register.decision !== (shouldGo ? 'GO' : 'NO_GO')) failures.push('decision_mismatch');
  if (register.status !== (shouldGo ? 'Complete' : 'Open')) failures.push('overall_status_mismatch');
  if (register.noSecretsStored !== true) failures.push('no_secrets_stored_required');
  if (!DIGEST.test(String(register.sha256 || ''))) failures.push('sha256_invalid');

  const { sha256, ...unsigned } = register;
  const digest = createHash('sha256').update(JSON.stringify(unsigned)).digest('hex');
  if (sha256 !== digest) failures.push('sha256_mismatch');
  if (register?.sourceOfTruth?.statusRule?.includes('advisory only') !== true) {
    failures.push('status_rule_truth_boundary_missing');
  }
  return failures;
}

function parseArg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) || null;
}

function runCli() {
  const file = parseArg('file') || DEFAULT_PATH;
  const expectedCommitSha = parseArg('sha') || process.env.RELEASE_COMMIT_SHA || process.env.GITHUB_SHA || null;
  let register;
  try {
    register = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    console.error('generated P0 register is missing or invalid JSON');
    process.exit(1);
  }
  const failures = validateGeneratedP0Register(register, { expectedCommitSha });
  if (failures.length > 0) {
    console.error('Generated P0 register validation failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Generated P0 register valid: ${register.completed}/${register.total}, ${register.decision}, ${register.commitSha}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
