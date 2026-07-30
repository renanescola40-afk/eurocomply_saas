#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const FULL_SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const DEFAULT_REGISTRY = 'docs/compliance/eu-ai-act-product-coverage-registry.json';
const DEFAULT_JSON = 'artifacts/eu-ai-act-product-coverage/eu-ai-act-product-coverage.json';
const DEFAULT_MARKDOWN = 'artifacts/eu-ai-act-product-coverage/eu-ai-act-product-coverage.md';
const ACCEPTED_RUNTIME_STATUS = new Set(['PASS', 'SUCCESS', 'GO', 'VERIFIED']);
const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const LEGAL_RULES_EVIDENCE_ITEM = 'legal-rules-validation';
const REDACTION_CONFIRMATION = 'Redaction confirmed for runtime evidence.';

function fail(message) { throw new Error(message); }

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function repositoryPathExists(path) { return existsSync(resolve(path)); }
function allRepositoryPathsExist(paths) { return paths.length === 0 || paths.every(repositoryPathExists); }
function missingRepositoryPaths(paths) { return paths.filter((path) => !repositoryPathExists(path)); }

function runtimeCandidatePaths(path, evidenceRoots) {
  return [resolve(path), ...evidenceRoots.map((root) => resolve(root, path))];
}

export function validateLegalRulesRuntimeEvidenceDocument(document, targetSha) {
  if (!document || typeof document !== 'object') return false;
  if (document.evidenceItem !== LEGAL_RULES_EVIDENCE_ITEM) return false;
  if (document.schema !== 'risck-comply.legal-rules-runtime-evidence.v1') return false;
  if (document.repository !== REPOSITORY) return false;
  if (document.deploymentSha !== targetSha || !FULL_SHA.test(String(document.deploymentSha || ''))) return false;
  if (String(document.status || '').toUpperCase() !== 'PASS') return false;
  if (document.countsForRuntimeCoverage !== true) return false;
  if (typeof document.environment !== 'string' || !document.environment || document.environment === 'unknown') return false;
  if (document.redactionConfirmation !== REDACTION_CONFIRMATION) return false;
  try {
    const deploymentUrl = new URL(document.deploymentUrl);
    const local = deploymentUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(deploymentUrl.hostname);
    if (deploymentUrl.protocol !== 'https:' && !local) return false;
    if (deploymentUrl.username || deploymentUrl.password || deploymentUrl.search || deploymentUrl.hash) return false;
  } catch {
    return false;
  }
  if (typeof document.legalRulesVersion !== 'string' || !document.legalRulesVersion) return false;
  if (!Array.isArray(document.sourceRegulations) || !document.sourceRegulations.includes('Regulation (EU) 2026/1744')) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(document.effectiveDate || ''))) return false;
  if (!SHA256.test(String(document.rulesDigest || ''))) return false;
  if (!SHA256.test(String(document.artifactSha256 || ''))) return false;
  if (!Array.isArray(document.testCases) || document.testCases.length < 8) return false;
  if (document.testCases.some((testCase) => testCase?.status !== 'PASS')) return false;
  if (!Array.isArray(document.requestIds) || document.requestIds.length === 0) return false;
  if (document.requestIds.some((requestId) => !/^[A-Za-z0-9._:-]{8,128}$/.test(String(requestId)))) return false;
  if (document.evidenceIntegrity?.placeholderOnly !== false) return false;
  if (document.evidenceIntegrity?.runtimeProofInvented !== false) return false;
  if (document.evidenceIntegrity?.customerFacingProof !== false) return false;
  if (document.evidenceIntegrity?.containsSensitiveValues !== false) return false;
  if (typeof document.evidenceBoundary !== 'string' || !document.evidenceBoundary.trim()) return false;
  const { artifactSha256, ...withoutArtifactDigest } = document;
  return artifactSha256 === digest(withoutArtifactDigest);
}

export function validateRuntimeEvidenceDocument(document, targetSha) {
  if (!document || typeof document !== 'object') return false;
  if (document.schema === 'risck-comply.legal-rules-runtime-evidence.v1') {
    return validateLegalRulesRuntimeEvidenceDocument(document, targetSha);
  }
  if (document.repository !== REPOSITORY) return false;
  if (document.targetSha !== targetSha) return false;
  if (!ACCEPTED_RUNTIME_STATUS.has(String(document.status || '').toUpperCase())) return false;
  if (document.schema !== 'risck-comply.eu-ai-act-runtime-evidence.v1') return false;
  if (document.syntheticData !== true) return false;
  if (!Array.isArray(document.limitations) || document.limitations.length === 0) return false;
  return true;
}

function runtimeEvidenceExists(path, evidenceRoots, targetSha) {
  for (const candidate of runtimeCandidatePaths(path, evidenceRoots)) {
    if (!existsSync(candidate)) continue;
    try {
      const document = JSON.parse(readFileSync(candidate, 'utf8'));
      if (validateRuntimeEvidenceDocument(document, targetSha)) return true;
    } catch {
      // malformed evidence remains unaccepted
    }
  }
  return false;
}

function missingRuntime(paths, evidenceRoots, targetSha) {
  return paths.filter((path) => !runtimeEvidenceExists(path, evidenceRoots, targetSha));
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

function classify(item, { evidenceRoots, targetSha }) {
  const implementationReady = allRepositoryPathsExist(item.implementationEvidence);
  const ciReady = implementationReady && allRepositoryPathsExist(item.testEvidence);
  const runtimeRequired = item.runtimeEvidence.length > 0;
  const missingRuntimeEvidence = missingRuntime(item.runtimeEvidence, evidenceRoots, targetSha);
  const runtimeReady = ciReady && (!runtimeRequired || missingRuntimeEvidence.length === 0);
  const humanRequired = item.humanReviewEvidence.length > 0;
  const humanReady = runtimeReady && (!humanRequired || allRepositoryPathsExist(item.humanReviewEvidence));

  let state = 'NOT_STARTED';
  if (implementationReady) state = 'IMPLEMENTED';
  if (ciReady) state = 'CI_VERIFIED';
  if (runtimeReady) state = 'RUNTIME_VERIFIED';
  if (humanReady) state = 'COMPLETE';
  else if (runtimeReady && humanRequired) state = 'HUMAN_REVIEW_REQUIRED';

  return {
    id: item.id, name: item.name, weight: item.weight, state,
    implementationReady, ciReady, runtimeReady, humanReady,
    missing: {
      implementation: missingRepositoryPaths(item.implementationEvidence),
      tests: missingRepositoryPaths(item.testEvidence),
      runtime: missingRuntimeEvidence,
      humanReview: missingRepositoryPaths(item.humanReviewEvidence),
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

export function generateCoverage({ registry, targetSha, branch = 'main', generatedAt = new Date().toISOString(), evidenceRoots = [] }) {
  if (!FULL_SHA.test(targetSha)) fail('targetSha must be a full lowercase Git SHA');
  if (!Array.isArray(evidenceRoots) || evidenceRoots.some((root) => typeof root !== 'string')) fail('evidenceRoots must be an array of paths');
  const failures = validateRegistry(registry);
  if (failures.length) fail(failures.join('; '));

  const workstreams = registry.workstreams.map((item) => classify(item, { evidenceRoots, targetSha }));
  const scores = {
    implementationCoverage: weightedScore(workstreams, (item) => item.implementationReady),
    ciVerifiedCoverage: weightedScore(workstreams, (item) => item.ciReady),
    runtimeEvidenceCoverage: weightedScore(workstreams, (item) => item.runtimeReady),
    completedCoverage: weightedScore(workstreams, (item) => item.humanReady),
  };
  const blockers = workstreams.filter((item) => item.state !== 'COMPLETE')
    .map((item) => ({ id: item.id, state: item.state, weight: item.weight, missing: item.missing }));
  const releaseDecision = scores.completedCoverage === 100 && blockers.length === 0
    ? 'EU_AI_ACT_PRODUCT_COVERAGE_GO' : 'EU_AI_ACT_PRODUCT_COVERAGE_NO_GO';

  const report = {
    schema: 'risck-comply.eu-ai-act-product-coverage-report.v1', generatedAt,
    repository: REPOSITORY, branch, targetSha,
    scoreBoundary: {
      measuresProductWorkflowCoverage: true,
      legalComplianceGuarantee: false,
      enterpriseReadinessScore: 'separate',
      runtimeEvidenceMayUseExactShaArtifactOverlays: true,
    },
    scores,
    remaining: {
      implementation: 100 - scores.implementationCoverage,
      ciVerified: 100 - scores.ciVerifiedCoverage,
      runtimeEvidence: 100 - scores.runtimeEvidenceCoverage,
      completed: 100 - scores.completedCoverage,
    },
    releaseDecision, workstreams, blockers,
  };
  return { ...report, integrity: { sha256: createHash('sha256').update(JSON.stringify(stable(report))).digest('hex') } };
}

export function renderMarkdown(report) {
  const lines = [
    '# EU AI Act Product Coverage Rebaseline', '',
    `- **Assessed SHA:** \`${report.targetSha}\``,
    `- **Implementation coverage:** ${report.scores.implementationCoverage}%`,
    `- **CI-verified coverage:** ${report.scores.ciVerifiedCoverage}%`,
    `- **Runtime evidence coverage:** ${report.scores.runtimeEvidenceCoverage}%`,
    `- **Completed coverage:** ${report.scores.completedCoverage}%`,
    `- **Remaining to complete:** ${report.remaining.completed}%`,
    `- **Decision:** ${report.releaseDecision}`, '',
    '> This score measures product workflow and evidence coverage. It is not a legal-compliance guarantee, certification or regulator approval.', '',
    '## Workstreams', '',
    '| Workstream | Weight | State | Missing implementation | Missing tests | Missing runtime | Missing human review |',
    '|---|---:|---|---:|---:|---:|---:|',
    ...report.workstreams.map((item) => `| ${item.name} | ${item.weight} | ${item.state} | ${item.missing.implementation.length} | ${item.missing.tests.length} | ${item.missing.runtime.length} | ${item.missing.humanReview.length} |`),
    '', '## Highest-weight blockers', '',
    ...report.blockers.sort((a, b) => b.weight - a.weight).slice(0, 12)
      .map((item) => `- **${item.id} (${item.weight} points):** ${item.state}`), '',
  ];
  return lines.join('\n');
}

function main() {
  const registryPath = process.env.EU_AI_ACT_COVERAGE_REGISTRY || DEFAULT_REGISTRY;
  const jsonPath = process.env.EU_AI_ACT_COVERAGE_JSON || DEFAULT_JSON;
  const markdownPath = process.env.EU_AI_ACT_COVERAGE_MARKDOWN || DEFAULT_MARKDOWN;
  const targetSha = String(process.env.TARGET_SHA || process.env.GITHUB_SHA || '').trim().toLowerCase();
  const branch = String(process.env.TARGET_BRANCH || process.env.GITHUB_REF_NAME || 'main');
  const evidenceRoots = String(process.env.EU_AI_ACT_RUNTIME_EVIDENCE_ROOTS || '').split(',').map((value) => value.trim()).filter(Boolean);
  const registry = JSON.parse(readFileSync(resolve(registryPath), 'utf8'));
  const report = generateCoverage({ registry, targetSha, branch, evidenceRoots });
  mkdirSync(dirname(resolve(jsonPath)), { recursive: true });
  mkdirSync(dirname(resolve(markdownPath)), { recursive: true });
  writeFileSync(resolve(jsonPath), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  writeFileSync(resolve(markdownPath), `${renderMarkdown(report)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ scores: report.scores, remaining: report.remaining, decision: report.releaseDecision }));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) main();
