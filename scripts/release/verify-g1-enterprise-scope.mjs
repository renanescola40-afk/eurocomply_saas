#!/usr/bin/env node
// G1 acceptance verifier: pure source/evidence admission, NEVER a production release action.
import { existsSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;
const STATES = new Set(['NOT_VERIFIED', 'EVIDENCE_VERIFIED_PENDING_REVIEW', 'BLOCKED', 'PASS']);
const evidenceRoot = resolve(process.cwd());

const nonPlaceholder = (value) =>
  typeof value === 'string' && value.trim().length > 0 &&
  !/^(REPLACE_WITH|TBD|TODO|UNKNOWN)/i.test(value.trim());

export function evaluateG1Scope(scope, root = evidenceRoot) {
  const errors = [];
  const items = Array.isArray(scope?.mandatory) ? scope.mandatory : [];
  if (scope?.schema !== 'risck-comply.g1-enterprise-scope.v1') errors.push('invalid scope schema');
  if (!FULL_SHA.test(String(scope?.sourceBaselineSha ?? ''))) errors.push('invalid baseline SHA');
  if (scope?.scoring?.denominator !== 38) errors.push('denominator must be exactly 38');
  if (items.length !== 38) errors.push('mandatory register must contain 38 criteria');
  const ids = items.map(item => item?.id);
  if (new Set(ids).size !== ids.length) errors.push('duplicate A criterion IDs');
  const byId = new Map(items.map(item => [item?.id, item]));
  const passed = [];
  const evidencePending = [];

  for (const item of items) {
    const id = String(item?.id ?? '');
    if (!/^(SEC|FUN|BIL|DAT|QAT|OPS|TRU)-\d{2}$/.test(id)) errors.push('invalid criterion ID: ' + id);
    if (item?.classification !== 'A') errors.push('non-A entry in mandatory scope: ' + id);
    if (!STATES.has(item?.status)) errors.push('invalid state: ' + id);
    const dependencies = Array.isArray(item?.dependencies) ? item.dependencies : [];
    for (const dependency of dependencies) {
      if (!byId.has(dependency)) errors.push('unknown dependency: ' + id + ' -> ' + dependency);
    }
    if (item?.status !== 'PASS') {
      if (item?.acceptedBy != null || item?.acceptedAt != null) {
        errors.push('non-PASS entry contains acceptedBy/acceptedAt: ' + id);
      }
      if (item?.status === 'EVIDENCE_VERIFIED_PENDING_REVIEW') evidencePending.push(id);
      continue;
    }
    if (!nonPlaceholder(item.acceptedBy)) errors.push('PASS missing approver: ' + id);
    const date = Date.parse(item.acceptedAt);
    if (!Number.isFinite(date) || date > Date.now()) errors.push('PASS invalid acceptance time: ' + id);
    const refs = item.evidenceRefs;
    if (!Array.isArray(refs) || refs.length < 1) {
      errors.push('PASS has no evidence: ' + id);
    } else {
      for (const ref of refs) {
        if (!nonPlaceholder(ref) || ref.startsWith('/') || ref.includes('..')) {
          errors.push('PASS evidence path unsafe: ' + id);
          continue;
        }
        const target = resolve(root, ref);
        if (relative(root, target).startsWith('..') || !existsSync(target)) {
          errors.push('PASS evidence file missing: ' + id + ' (' + ref + ')');
        }
      }
    }
    for (const dependency of dependencies) {
      if (byId.get(dependency)?.status !== 'PASS') {
        errors.push('PASS dependency not accepted: ' + id + ' -> ' + dependency);
      }
    }
    passed.push(id);
  }

  return {
    schema: 'risck-comply.g1-scope-acceptance-verification.v1',
    sourceBaselineSha: scope?.sourceBaselineSha ?? null,
    denominator: 38,
    passed: passed.length,
    percent: Number((passed.length / 38 * 100).toFixed(2)),
    passIds: passed,
    evidencePending,
    errors,
    valid: errors.length === 0,
    productionReleaseAuthorized: false,
    allCriteriaPassedInScope: errors.length === 0 && passed.length === 38,
    enterprise100: false, // Scope evidence alone never proves a production release GO.
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const path = resolve(process.argv[2] ?? 'config/g1-enterprise-scope-v1.json');
  try {
    const scope = JSON.parse(readFileSync(path, 'utf8'));
    const result = evaluateG1Scope(scope);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (!result.valid || (process.argv.includes('--require-all-accepted') && !result.allCriteriaPassedInScope)) process.exitCode = 2;
  } catch (error) {
    process.stderr.write('G1 acceptance verification failed: ' + String(error) + '\n');
    process.exitCode = 2;
  }
}
