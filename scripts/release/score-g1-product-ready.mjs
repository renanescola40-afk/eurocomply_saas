#!/usr/bin/env node
// Owner-directed G1 Enterprise Product Ready (24 A gates), preserving all 38 original technical controls.
// This is evidence-led scoring only; never grants a production release or changes provider data.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { evaluateG1Scope } from './verify-g1-enterprise-scope.mjs';

export function evaluateProductReady(registry, projection, evidenceRoot = process.cwd()) {
  const errors = [];
  const expected = { A_MANDATORY: 24, B_CUSTOMER_SPECIFIC: 6, C_ENHANCEMENTS: 5,
    D_CONDITIONAL_OR_NOT_APPLICABLE: 3, TOTAL_SCOPE_ITEMS: 38,
    PRODUCT_READY_DENOMINATOR: 24, ATOMIC_REQUIRED_SOURCE_CHECKS: 38 };
  if (projection?.schema !== 'risck-comply.g1-product-ready-scoring.v1') errors.push('invalid scoring schema');
  for (const [key, value] of Object.entries(expected))
    if (projection?.scoringContract?.[key] !== value) errors.push('invalid scoring count: ' + key);
  if (registry?.schema !== 'risck-comply.g1-enterprise-scope.v1') errors.push('invalid source register');
  if (projection?.referenceRegistrySourceBaselineSha !== registry?.sourceBaselineSha) errors.push('source baseline SHA mismatch');
  for (const [key, length] of [['B',6],['C',5],['D',3]])
    if (registry?.categories?.[key]?.length !== length) errors.push('source category ' + key + ' changed without reviewed reclassification');

  const atomic = Array.isArray(registry?.mandatory) ? registry.mandatory : [];
  const groups = Array.isArray(projection?.groups) ? projection.groups : [];
  if (atomic.length !== 38) errors.push('all 38 atomic requirements must remain preserved');
  if (groups.length !== 24) errors.push('exactly 24 A product gates required');
  const originalIds = atomic.map(x => x.id);
  const ids = groups.map(x => x?.id);
  const assigned = groups.flatMap(x => Array.isArray(x?.atomicCriteria) ? x.atomicCriteria : []);
  if (new Set(ids).size !== ids.length) errors.push('duplicate A gate IDs');
  if (new Set(assigned).size !== assigned.length) errors.push('atomic requirement assigned more than once');
  if (assigned.length !== 38 || assigned.some(x => !originalIds.includes(x)) || originalIds.some(x => !assigned.includes(x)))
    errors.push('mandatory atomic scope dropped or invented');
  const atomicById = new Map(atomic.map(x => [x.id, x]));
  const evidence = evaluateG1Scope(registry, evidenceRoot);
  if (!evidence.valid) errors.push(...evidence.errors.map(x => 'atomic evidence invalid: ' + x));

  const outcomes = groups.map((group) => {
    if (!/^A-(0[1-9]|1[0-9]|2[0-4])$/.test(String(group?.id)) || group?.category !== 'A' ||
        group?.acceptance !== 'ALL_ATOMIC_CRITERIA_PASS' || !Array.isArray(group?.atomicCriteria) ||
        !group.atomicCriteria.length) errors.push('invalid A group definition: ' + group?.id);
    const entries = (group?.atomicCriteria ?? []).map(x => atomicById.get(x));
    let status = 'PENDING';
    if (entries.some(x => x?.status === 'BLOCKED')) status = 'BLOCKED';
    else if (entries.every(x => x?.status === 'PASS') && evidence.valid) status = 'PASS';
    else if (entries.some(x => x?.status === 'PASS' || x?.status === 'EVIDENCE_VERIFIED_PENDING_REVIEW')) status = 'PARTIAL';
    return { id: group.id, status, atomicCriteria: group.atomicCriteria };
  });
  const count = status => outcomes.filter(x => x.status === status).length;
  const pass = errors.length === 0 ? count('PASS') : 0;
  return {
    schema: 'risck-comply.g1-product-readiness-result.v1',
    A_TOTAL: 24, A_PASS: pass,
    A_PARTIAL: errors.length === 0 ? count('PARTIAL') : 0,
    A_BLOCKED: errors.length === 0 ? count('BLOCKED') : 24,
    A_PENDING: errors.length === 0 ? count('PENDING') : 0,
    ENTERPRISE_PRODUCT_READY_PERCENT: Number((pass / 24 * 100).toFixed(2)),
    OVERALL_SCOPE_TOTAL: 38,
    // B/C/D are not automatically 'closed'; no signed acceptance records exist in this view.
    OVERALL_SCOPE_CLOSED: pass,
    OVERALL_SCOPE_COMPLETION_PERCENT: Number((pass / 38 * 100).toFixed(2)),
    atomicAccepted: evidence.passed, atomicRequired: 38,
    groupStates: outcomes,
    errors,
    valid: errors.length === 0,
    enterprise100: false,
    productionReleaseAuthorized: false,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const registry = JSON.parse(readFileSync('config/g1-enterprise-scope-v1.json','utf8'));
    const projection = JSON.parse(readFileSync('config/g1-product-ready-24-gates.json','utf8'));
    const result = evaluateProductReady(registry, projection);
    process.stdout.write(JSON.stringify(result,null,2) + '\n');
    if (!result.valid) process.exitCode = 2;
  } catch (e) {
    process.stderr.write('G1 scoring failed closed: ' + String(e.message ?? e) + '\n');
    process.exitCode = 2;
  }
}
