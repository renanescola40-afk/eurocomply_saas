#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const FULL_SHA = /^[a-f0-9]{40}$/;
const DEFAULT_REGISTRY = 'docs/compliance/eu-ai-act-product-coverage-registry.json';
const DEFAULT_JSON = 'artifacts/eu-ai-act-product-coverage/eu-ai-act-product-coverage.json';
const DEFAULT_MARKDOWN = 'artifacts/eu-ai-act-product-coverage/eu-ai-act-product-coverage.md';

function fail(message) {
  throw new Error(message);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function allExist(paths) {
  return paths.length === 0 || paths.every((path) => existsSync(resolve(path)));
}

function missing(paths) {
  return paths.filter((path) => !existsSync(resolve(path)));
}

export function validateRegistry(registry) {
  const failures = [];
  if (registry?.schema !== 'risck-comply.eu-ai-act-product-coverage-registry.v1') failures.push('invalid registry schema');
  if (!Array.isArray(registry?.workstreams) || registry.workstreams.length === 0) failures.push('workstreams must be a non-empty array');
  const ids = new Set();
  let totalWeight = 0;
  for (const item of registry?.workstreams ?? []) {
    if (!/^[A-Z0-9][A-Z0-9-]{1,79}$/.test(String(item?.id ?? ''))) failures.push(`invalid workstream id: ${item?.id}`);
    if (ids.has(item.id)) failures.push(`duplicate workstream id: ${item.id}`);
    ids.add(item.id);
    if (!Number.isFinite(item.weight) || item.weight <= 0) failures.push(`invalid weight for ${item.id}`);
    totalWeight += Number(item.weight ?? 0);
    for (const field of ['implementationEvidence', 'testEvidence', 'runtimeEvidence', 'humanReviewEvidence']) {
      if (!Array.isArray(item[field])) failures.push(`${item.id}.${field} must be an array`);
      for (const path of item[field] ?? []) {
        if (typeof path !== 'string' || path.startsWith('/') || path.includes('..')) failures.push(`unsafe evidence path in ${item.id}: ${path}`);
      }
    }
  }
  if (totalWeight !== registry?.totalWeight || totalWeight !== 100) failures.push(`registry weights must total 100; found ${totalWeight}`);
  return failures;
}

function classify(item) {
  const implementationReady = allExist(item.implementationEvidence);
  const ciReady = implementationReady && allExist(item.testEvidence);
  const runtimeRequired = item.runtimeEvidence.length > 0;
  const runtimeReady = ciReady && (!runtimeRequired || allExist(item.runtimeEvidence));
  const humanRequired = item.humanReviewEvidence.length > 0;
  const humanReady = runtimeReady && (!humanRequired || allExist(item.humanReviewEvidence));

  let state = 'NOT_STARTED';
  if (implementationReady) state = 'IMPLEMENTED';
  if (ciReady) state = 'CI_VERIFIED';
  if (runtimeReady) state = 'RUNTIME_VERIFIED';
  if (humanReady) state = 'COMPLETE';
  else if (runtimeReady && humanRequired) state = 'HUMAN_REVIEW_REQUIRED';

  return {
    id: item.id,
    name: item.name,
    weight: item.weight,
    state,
    implementationReady,
    ciReady,
    runtimeReady,
    humanReady,
    missing: {
      implementation: missing(item.implementationEvidence),
      tests: missing(item.testEvidence),
      runtime: missing(item.runtimeEvidence),
      humanReview: missing(item.humanReviewEvidence),
    },
    evidence: {
      implementation: item.implementationEvidence,
      tests: item.testEvidence,
      runtime: item.runtimeEvidence,
      humanReview: item.humanReviewEvidence,
    },
  };
}

function weightedScore(items, predicate) {
  return items.reduce((sum, item) => sum + (predicate(item) ? item.weight : 0), 0);
}

export function generateCoverage({ registry, targetSha, branch = 'main', generatedAt = new Date().toISOString() }) {
  if (!FULL_SHA.test(targetSha)) fail('targetSha must be a full lowercase Git SHA');
  const failures = validateRegistry(registry);
  if (failures.length) fail(failures.join('; '));

  const workstreams = registry.workstreams.map(classify);
  const scores = {
    implementationCoverage: weightedScore(workstreams, (item) => item.implementationReady),
    ciVerifiedCoverage: weightedScore(workstreams, (item) => item.ciReady),
    runtimeEvidenceCoverage: weightedScore(workstreams, (item) => item.runtimeReady),
    completedCoverage: weightedScore(workstreams, (item) => item.humanReady),
  };
  const blockers = workstreams
    .filter((item) => item.state !== 'COMPLETE')
    .map((item) => ({ id: item.id, state: item.state, weight: item.weight, missing: item.missing }));
  const releaseDecision = scores.completedCoverage === 100 && blockers.length === 0
    ? 'EU_AI_ACT_PRODUCT_COVERAGE_GO'
    : 'EU_AI_ACT_PRODUCT_COVERAGE_NO_GO';

  const report = {
    schema: 'risck-comply.eu-ai-act-product-coverage-report.v1',
    generatedAt,
    repository: 'renanescola40-afk/eurocomply_saas',
    branch,
    targetSha,
    scoreBoundary: {
      measuresProductWorkflowCoverage: true,
      legalComplianceGuarantee: false,
      enterpriseReadinessScore: 'separate',
    },
    scores,
    remaining: {
      implementation: 100 - scores.implementationCoverage,
      ciVerified: 100 - scores.ciVerifiedCoverage,
      runtimeEvidence: 100 - scores.runtimeEvidenceCoverage,
      completed: 100 - scores.completedCoverage,
    },
    releaseDecision,
    workstreams,
    blockers,
  };
  return {
    ...report,
    integrity: {
      sha256: createHash('sha256').update(JSON.stringify(stable(report))).digest('hex'),
    },
  };
}

export function renderMarkdown(report) {
  const lines = [
    '# EU AI Act Product Coverage Rebaseline',
    '',
    `- **Assessed SHA:** \`${report.targetSha}\``,
    `- **Implementation coverage:** ${report.scores.implementationCoverage}%`,
    `- **CI-verified coverage:** ${report.scores.ciVerifiedCoverage}%`,
    `- **Runtime evidence coverage:** ${report.scores.runtimeEvidenceCoverage}%`,
    `- **Completed coverage:** ${report.scores.completedCoverage}%`,
    `- **Remaining to complete:** ${report.remaining.completed}%`,
    `- **Decision:** ${report.releaseDecision}`,
    '',
    '> This score measures product workflow and evidence coverage. It is not a legal-compliance guarantee, certification or regulator approval.',
    '',
    '## Workstreams',
    '',
    '| Workstream | Weight | State | Missing implementation | Missing tests | Missing runtime | Missing human review |',
    '|---|---:|---|---:|---:|---:|---:|',
    ...report.workstreams.map((item) => `| ${item.name} | ${item.weight} | ${item.state} | ${item.missing.implementation.length} | ${item.missing.tests.length} | ${item.missing.runtime.length} | ${item.missing.humanReview.length} |`),
    '',
    '## Highest-weight blockers',
    '',
    ...report.blockers
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 12)
      .map((item) => `- **${item.id} (${item.weight} points):** ${item.state}`),
    '',
  ];
  return lines.join('\n');
}

function main() {
  const registryPath = process.env.EU_AI_ACT_COVERAGE_REGISTRY || DEFAULT_REGISTRY;
  const jsonPath = process.env.EU_AI_ACT_COVERAGE_JSON || DEFAULT_JSON;
  const markdownPath = process.env.EU_AI_ACT_COVERAGE_MARKDOWN || DEFAULT_MARKDOWN;
  const targetSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
  const branch = String(process.env.TARGET_BRANCH || process.env.GITHUB_REF_NAME || 'main');
  const registry = JSON.parse(readFileSync(resolve(registryPath), 'utf8'));
  const report = generateCoverage({ registry, targetSha, branch });
  mkdirSync(dirname(resolve(jsonPath)), { recursive: true });
  mkdirSync(dirname(resolve(markdownPath)), { recursive: true });
  writeFileSync(resolve(jsonPath), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  writeFileSync(resolve(markdownPath), `${renderMarkdown(report)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ scores: report.scores, remaining: report.remaining, decision: report.releaseDecision }));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) main();
