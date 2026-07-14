#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export const STATUS = Object.freeze({
  PASS: 'PASS',
  PARTIAL: 'PARTIAL',
  FAIL: 'FAIL',
  BLOCKED: 'BLOCKED',
  NOT_VERIFIED: 'NOT_VERIFIED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
});

const DEFAULT_CONFIG = 'docs/enterprise/controls.json';
const DEFAULT_JSON = 'artifacts/enterprise-readiness/enterprise-readiness-scorecard.json';
const DEFAULT_MARKDOWN = 'artifacts/enterprise-readiness/enterprise-readiness-scorecard.md';
const DEFAULT_GITHUB_CHECKS = 'artifacts/enterprise-readiness/github-checks-evidence.json';

const REPOSITORY_CHECKS = new Set([
  'deterministicInstall',
  'packageLockAligned',
  'lint',
  'typecheck',
  'unitTests',
  'build',
  'e2e',
  'npmAudit',
  'routeQuality',
  'codeql',
  'semgrep',
  'secretScanning',
  'publicSecretScan',
  'dependencyReview',
  'actionlint',
  'fullSecuritySuite',
  'enterpriseProductionGate',
  'securityCi',
  'requiredChecks',
]);

function normalizeStatus(value) {
  const normalized = String(value ?? '').trim().toUpperCase().replace(/[ -]+/g, '_');
  if (['PASS', 'PASSED', 'SUCCESS', 'COMPLETE', 'COMPLETED', 'GREEN'].includes(normalized)) return STATUS.PASS;
  if (['PARTIAL', 'PARTIALLY_COMPLETE', 'DEGRADED'].includes(normalized)) return STATUS.PARTIAL;
  if (['FAIL', 'FAILED', 'FAILURE', 'RED'].includes(normalized)) return STATUS.FAIL;
  if (['BLOCKED'].includes(normalized)) return STATUS.BLOCKED;
  if (['NOT_APPLICABLE', 'N_A', 'NA'].includes(normalized)) return STATUS.NOT_APPLICABLE;
  return STATUS.NOT_VERIFIED;
}

function findCheck(document, checkName) {
  if (!checkName || !Array.isArray(document?.checks)) return null;
  return document.checks.find((item) => item?.name === checkName || item?.id === checkName || item?.control === checkName) ?? null;
}

export function evaluateEvidenceDocument(document, checkName) {
  if (!document || typeof document !== 'object') return STATUS.NOT_VERIFIED;

  const check = findCheck(document, checkName);
  if (check) {
    if (check.blocked === true) return STATUS.BLOCKED;
    if (check.passed === true || check.success === true) return STATUS.PASS;
    if (check.passed === false || check.success === false) return STATUS.FAIL;
    return normalizeStatus(check.status ?? check.outcome);
  }

  if (checkName) return STATUS.NOT_VERIFIED;
  if (document.blocked === true) return STATUS.BLOCKED;

  const outcome = normalizeStatus(document.outcome);
  const status = normalizeStatus(document.status);
  if (outcome === STATUS.FAIL || status === STATUS.FAIL) return STATUS.FAIL;
  if (outcome === STATUS.BLOCKED || status === STATUS.BLOCKED) return STATUS.BLOCKED;
  if (outcome === STATUS.PASS && [STATUS.PASS, STATUS.NOT_VERIFIED].includes(status)) return STATUS.PASS;
  if (status === STATUS.PASS && [STATUS.PASS, STATUS.NOT_VERIFIED].includes(outcome)) return STATUS.PASS;
  if (outcome === STATUS.PARTIAL || status === STATUS.PARTIAL) return STATUS.PARTIAL;
  return STATUS.NOT_VERIFIED;
}

export function validateConfig(config) {
  const failures = [];
  if (config?.schemaVersion !== 1) failures.push('schemaVersion must be 1');
  if (!Array.isArray(config?.domains)) failures.push('domains must be an array');

  const ids = new Set();
  let controlCount = 0;
  let totalWeight = 0;

  for (const domain of config?.domains ?? []) {
    if (!domain.id || !domain.prefix || !Array.isArray(domain.controls)) failures.push(`invalid domain: ${domain?.id ?? 'unknown'}`);
    if (domain.controls?.length !== 10) failures.push(`${domain.id} must define exactly 10 controls`);
    if (domain.weight !== 10) failures.push(`${domain.id} weight must be 10`);

    for (const [index, control] of (domain.controls ?? []).entries()) {
      const id = `${domain.prefix}-${String(index + 1).padStart(2, '0')}`;
      if (ids.has(id)) failures.push(`duplicate control id: ${id}`);
      ids.add(id);
      controlCount += 1;
      totalWeight += domain.weight / domain.controls.length;
      if (!control.title) failures.push(`${id} title is required`);
      if (!control.evidence?.path) failures.push(`${id} evidence.path is required`);
    }
  }

  if (controlCount !== config.controlCount || controlCount !== 100) failures.push(`control count must be 100, received ${controlCount}`);
  if (Math.abs(totalWeight - config.totalWeight) > 0.0001 || config.totalWeight !== 100) failures.push(`total weight must be 100, received ${totalWeight}`);
  return failures;
}

function readJson(path) {
  try {
    return { document: JSON.parse(readFileSync(path, 'utf8')), missing: false, invalid: false };
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return { document: null, missing: true, invalid: false };
    }
    return { document: null, missing: false, invalid: true };
  }
}

export function createEvidenceReader({
  githubChecksPath = process.env.GITHUB_CHECKS_EVIDENCE_PATH || DEFAULT_GITHUB_CHECKS,
  expectedSha = process.env.ENTERPRISE_EXPECTED_SHA || '',
} = {}) {
  return function readEvidence(evidence) {
    const useExactShaChecks = Boolean(evidence.check && REPOSITORY_CHECKS.has(evidence.check));

    if (useExactShaChecks) {
      const githubEvidence = readJson(githubChecksPath);
      if (!githubEvidence.missing) {
        if (githubEvidence.invalid) {
          return { status: STATUS.FAIL, reason: 'github_checks_evidence_invalid_json' };
        }

        if (
          expectedSha &&
          githubEvidence.document?.targetSha !== expectedSha
        ) {
          return { status: STATUS.NOT_VERIFIED, reason: 'github_checks_evidence_sha_mismatch' };
        }

        return {
          status: evaluateEvidenceDocument(githubEvidence.document, evidence.check),
          reason: `derived_from_exact_sha_check:${evidence.check}`,
        };
      }
    }

    const repositoryEvidence = readJson(evidence.path);
    if (repositoryEvidence.missing) {
      return { status: STATUS.NOT_VERIFIED, reason: 'evidence_file_missing' };
    }
    if (repositoryEvidence.invalid) {
      return { status: STATUS.FAIL, reason: 'evidence_file_invalid_json' };
    }

    return {
      status: evaluateEvidenceDocument(repositoryEvidence.document, evidence.check),
      reason: evidence.check ? `derived_from_check:${evidence.check}` : 'derived_from_document_status',
    };
  };
}

function statusFactor(status) {
  if (status === STATUS.PASS) return 1;
  if (status === STATUS.PARTIAL) return 0.5;
  return 0;
}

function classification(score, criticalOpen) {
  if (score === 100 && criticalOpen === 0) return 'ENTERPRISE_GO';
  if (score >= 90) return 'ENTERPRISE_CANDIDATE';
  if (score >= 75) return 'PRODUCTION_WITH_ENTERPRISE_LIMITATIONS';
  if (score >= 60) return 'CONTROLLED_BETA';
  if (score >= 40) return 'MVP';
  return 'PROTOTYPE';
}

export function calculateScorecard(config, evidenceReader = createEvidenceReader()) {
  const controls = [];
  const domains = [];
  let achievedWeight = 0;
  let applicableWeight = 0;

  for (const domain of config.domains) {
    const controlWeight = domain.weight / domain.controls.length;
    let domainAchieved = 0;
    let domainApplicable = 0;

    domain.controls.forEach((control, index) => {
      const id = `${domain.prefix}-${String(index + 1).padStart(2, '0')}`;
      const result = evidenceReader(control.evidence);
      const applicable = result.status !== STATUS.NOT_APPLICABLE;
      const earned = applicable ? controlWeight * statusFactor(result.status) : 0;
      if (applicable) {
        applicableWeight += controlWeight;
        domainApplicable += controlWeight;
      }
      achievedWeight += earned;
      domainAchieved += earned;
      controls.push({
        id,
        domain: domain.id,
        title: control.title,
        critical: Boolean(control.critical),
        weight: controlWeight,
        status: result.status,
        earnedWeight: earned,
        evidencePath: control.evidence.path,
        evidenceCheck: control.evidence.check ?? null,
        reason: result.reason,
      });
    });

    domains.push({
      id: domain.id,
      name: domain.name,
      weight: domain.weight,
      scorePercent: domainApplicable === 0 ? 0 : Number(((domainAchieved / domainApplicable) * 100).toFixed(1)),
    });
  }

  const scorePercent = applicableWeight === 0 ? 0 : Number(((achievedWeight / applicableWeight) * 100).toFixed(1));
  const counts = Object.fromEntries(Object.values(STATUS).map((status) => [status, controls.filter((item) => item.status === status).length]));
  const criticalOpen = controls.filter((item) => item.critical && item.status !== STATUS.PASS).length;
  const criticalFailed = controls.filter((item) => item.critical && item.status === STATUS.FAIL).length;
  const releaseDecision = scorePercent === 100 && criticalOpen === 0 ? 'GO' : 'NO_GO';
  const publishRecommendation = releaseDecision === 'GO'
    ? 'ENTERPRISE_PRODUCTION'
    : scorePercent >= 75 && criticalFailed === 0
      ? 'PRODUCTION_WITH_ENTERPRISE_LIMITATIONS'
      : scorePercent >= 60 && criticalFailed === 0
        ? 'CONTROLLED_BETA'
        : 'DO_NOT_PUBLISH';

  return {
    schema: 'risck-comply.enterprise-readiness-scorecard.v1',
    generatedFromRealEvidence: true,
    scorePercent,
    scoreOutOfTen: Number((scorePercent / 10).toFixed(2)),
    completedPercent: scorePercent,
    remainingPercent: Number((100 - scorePercent).toFixed(1)),
    classification: classification(scorePercent, criticalOpen),
    releaseDecision,
    publishRecommendation,
    criticalOpen,
    criticalFailed,
    counts,
    domains,
    controls,
  };
}

export function renderMarkdown(scorecard) {
  const lines = [
    '# RISCK COMPLY Enterprise Readiness',
    '',
    `- **Overall:** ${scorecard.scorePercent}% (${scorecard.scoreOutOfTen}/10)`,
    `- **Remaining:** ${scorecard.remainingPercent}%`,
    `- **Classification:** ${scorecard.classification}`,
    `- **Release decision:** ${scorecard.releaseDecision}`,
    `- **Publish recommendation:** ${scorecard.publishRecommendation}`,
    `- **Critical controls not PASS:** ${scorecard.criticalOpen}`,
    '',
    '## Domain scores',
    '',
    '| Domain | Score |',
    '|---|---:|',
    ...scorecard.domains.map((domain) => `| ${domain.name} | ${domain.scorePercent}% |`),
    '',
    '## Status counts',
    '',
    ...Object.entries(scorecard.counts).map(([status, count]) => `- ${status}: ${count}`),
    '',
    '## Highest-priority blockers',
    '',
    ...scorecard.controls
      .filter((control) => control.critical && control.status !== STATUS.PASS)
      .slice(0, 10)
      .map((control) => `- **${control.id} — ${control.title}:** ${control.status} (${control.evidencePath})`),
    '',
    '> Repository checks are bound to one exact GitHub SHA. Runtime and provider controls still require separate fresh evidence.',
    '',
  ];
  return lines.join('\n');
}

function main() {
  const configPath = process.env.ENTERPRISE_CONTROLS_PATH || DEFAULT_CONFIG;
  const jsonPath = process.env.ENTERPRISE_SCORECARD_JSON || DEFAULT_JSON;
  const markdownPath = process.env.ENTERPRISE_SCORECARD_MARKDOWN || DEFAULT_MARKDOWN;
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const failures = validateConfig(config);
  if (failures.length > 0) {
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  const scorecard = calculateScorecard(config);
  mkdirSync(dirname(jsonPath), { recursive: true });
  mkdirSync(dirname(markdownPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(scorecard, null, 2)}\n`);
  writeFileSync(markdownPath, renderMarkdown(scorecard));
  console.log(`Enterprise readiness: ${scorecard.scorePercent}% (${scorecard.releaseDecision})`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`Markdown: ${markdownPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();