#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const EXPECTED_PACKAGES = Object.freeze([
  ['legal-rules', 4, 'docs/compliance/evidence/accepted/legal-rules-qualified-review.json'],
  ['prohibited-practices', 7, 'docs/compliance/evidence/accepted/prohibited-practices-legal-review.json'],
  ['article-50-copy', 8, 'docs/compliance/evidence/accepted/article-50-copy-review.json'],
  ['fria-methodology', 6, 'docs/compliance/evidence/accepted/fria-methodology-review.json'],
  ['deployer-obligations', 7, 'docs/compliance/evidence/accepted/deployer-obligations-legal-review.json'],
  ['high-risk-provider', 9, 'docs/compliance/evidence/accepted/high-risk-provider-methodology-review.json'],
  ['conformity', 5, 'docs/compliance/evidence/accepted/conformity-qualified-review.json'],
  ['gpai', 5, 'docs/compliance/evidence/accepted/gpai-legal-review.json'],
]);

const ARRAY_FIELDS = [
  'reviewQuestions',
  'scope',
  'officialSources',
  'implementationEvidence',
  'testEvidence',
  'preReviewFindings',
  'acceptanceCriteria',
  'humanInputsRequired',
  'limitations',
];

function readJson(path) {
  try {
    return { document: JSON.parse(readFileSync(path, 'utf8')), error: null };
  } catch (error) {
    return { document: null, error: error instanceof Error ? error.message : 'invalid_json' };
  }
}

function validateFinding(finding, packageId, index) {
  const failures = [];
  if (!finding || typeof finding !== 'object' || Array.isArray(finding)) {
    return [`${packageId}.preReviewFindings[${index}]_invalid`];
  }
  for (const field of ['id', 'severity', 'status', 'finding', 'requiredDecision']) {
    if (typeof finding[field] !== 'string' || !finding[field].trim()) {
      failures.push(`${packageId}.preReviewFindings[${index}].${field}_missing`);
    }
  }
  return failures;
}

export function validateQualifiedReviewPackages({ root = process.cwd() } = {}) {
  const failures = [];
  const packages = [];

  for (const [id, expectedWeight, expectedDecisionPath] of EXPECTED_PACKAGES) {
    const directory = join(root, 'docs/legal-review-preparation/review-packages', id);
    const manifestPath = join(directory, 'manifest.json');
    const briefingPath = join(directory, 'PACKAGE.md');

    if (!existsSync(manifestPath)) {
      failures.push(`${id}.manifest_missing`);
      continue;
    }
    if (!existsSync(briefingPath)) failures.push(`${id}.briefing_missing`);

    const { document, error } = readJson(manifestPath);
    if (!document) {
      failures.push(`${id}.manifest_invalid:${error}`);
      continue;
    }

    if (document.schema !== 'risck-comply.qualified-review-package.v1') failures.push(`${id}.schema_invalid`);
    if (document.id !== id) failures.push(`${id}.id_mismatch`);
    if (document.weight !== expectedWeight) failures.push(`${id}.weight_mismatch`);
    if (document.status !== 'HUMAN_REVIEW_REQUIRED') failures.push(`${id}.status_must_remain_human_review_required`);
    if (document.acceptedDecisionPath !== expectedDecisionPath) failures.push(`${id}.accepted_path_mismatch`);

    for (const field of ARRAY_FIELDS) {
      if (!Array.isArray(document[field]) || document[field].length === 0) failures.push(`${id}.${field}_empty`);
    }

    for (const [index, finding] of (document.preReviewFindings ?? []).entries()) {
      failures.push(...validateFinding(finding, id, index));
    }

    const acceptedFileExists = existsSync(join(root, expectedDecisionPath));
    packages.push({
      id,
      weight: expectedWeight,
      manifestPath: `docs/legal-review-preparation/review-packages/${id}/manifest.json`,
      briefingPath: `docs/legal-review-preparation/review-packages/${id}/PACKAGE.md`,
      acceptedDecisionPath: expectedDecisionPath,
      preparationReady: failures.every((failure) => !failure.startsWith(`${id}.`)),
      legalAcceptance: acceptedFileExists ? 'REQUIRES_SEPARATE_TRUTH_GATE' : 'HUMAN_REVIEW_REQUIRED',
    });
  }

  const totalWeight = packages.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight !== 51) failures.push(`total_weight_mismatch:${totalWeight}`);

  const templatePath = join(root, 'docs/legal-review-preparation/QUALIFIED_REVIEW_DECISION_TEMPLATE.json');
  const template = readJson(templatePath).document;
  if (!template) failures.push('decision_template_missing_or_invalid');
  else {
    if (template.status !== 'HUMAN_REVIEW_REQUIRED') failures.push('decision_template_must_be_non_crediting');
    if (!String(template.nonCreditingNotice ?? '').includes('not evidence')) failures.push('decision_template_notice_missing');
  }

  return {
    schema: 'risck-comply.qualified-review-package-readiness.v1',
    generatedAt: new Date().toISOString(),
    packageCount: packages.length,
    totalWeight,
    preparationReadyCount: packages.filter((item) => item.preparationReady).length,
    legalAcceptedCount: 0,
    status: failures.length === 0 ? 'READY_FOR_QUALIFIED_REVIEW' : 'PACKAGE_PREPARATION_FAILED',
    failures: [...new Set(failures)].sort(),
    packages,
    notice: 'Package readiness is not legal acceptance. Accepted review remains governed by the exact-SHA legal truth gate.',
  };
}

function main() {
  const report = validateQualifiedReviewPackages();
  if (process.argv.includes('--write')) {
    const output = 'artifacts/legal-review/qualified-review-package-readiness.json';
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (process.argv.includes('--strict') && report.failures.length > 0) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
