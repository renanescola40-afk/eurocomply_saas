#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const REGISTRY_PATHS = Object.freeze({
  coverage: 'docs/compliance/eu-ai-act-product-coverage-registry.json',
  qualifiedReviews: 'docs/compliance/evidence/qualified-review-execution-registry.json',
  closure: 'docs/compliance/evidence/enterprise-evidence-closure-registry.json',
  articleMatrix: 'docs/compliance/article-function-evidence-registry.v1.json',
});

const OUTPUT_PATHS = Object.freeze({
  json: 'docs/legal-review-preparation/00_BASELINE_TRUTH_REPORT.json',
  markdown: 'docs/legal-review-preparation/00_BASELINE_TRUTH_REPORT.md',
});

const PLACEHOLDER_PATTERN = /(?:^|\b)(?:placeholder|example|sample|todo|tbd|replace[ _-]?me|dummy|fake|unknown)(?:\b|$)/i;
const PASS_VALUES = new Set(['PASS', 'PASSED', 'SUCCESS', 'ACCEPTED', 'COUNSEL_ACCEPTED']);
const ACCEPTED_DECISIONS = new Set(['ACCEPTED', 'ACCEPTED_WITH_CHANGES', 'COUNSEL_ACCEPTED']);

function readJson(root, repositoryPath) {
  const absolutePath = join(root, repositoryPath);
  if (!existsSync(absolutePath)) {
    return { exists: false, valid: false, document: null, error: 'missing' };
  }

  try {
    return {
      exists: true,
      valid: true,
      document: JSON.parse(readFileSync(absolutePath, 'utf8')),
      error: null,
    };
  } catch {
    return { exists: true, valid: false, document: null, error: 'invalid_json' };
  }
}

function normaliseStatus(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

function firstValue(document, keys) {
  for (const key of keys) {
    const value = document?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

function containsPlaceholder(value) {
  if (typeof value === 'string') return PLACEHOLDER_PATTERN.test(value.trim());
  if (Array.isArray(value)) return value.some(containsPlaceholder);
  if (value && typeof value === 'object') return Object.values(value).some(containsPlaceholder);
  return false;
}

function sha256File(root, repositoryPath) {
  const absolutePath = join(root, repositoryPath);
  if (!existsSync(absolutePath)) return null;
  return createHash('sha256').update(readFileSync(absolutePath)).digest('hex');
}

function resolveSourceSha(root) {
  if (process.env.LEGAL_AUDIT_SOURCE_SHA) return process.env.LEGAL_AUDIT_SOURCE_SHA.trim();
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.trim();
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN_SOURCE_SHA';
  }
}

function inspectPath(root, repositoryPath) {
  const absolutePath = join(root, repositoryPath);
  return {
    path: repositoryPath,
    exists: existsSync(absolutePath),
    sha256: sha256File(root, repositoryPath),
  };
}

function inspectRuntimeEvidence(root, repositoryPath, expectedSha) {
  const result = readJson(root, repositoryPath);
  if (!result.exists || !result.valid) {
    return {
      path: repositoryPath,
      exists: result.exists,
      validJson: result.valid,
      status: 'RUNTIME_EVIDENCE_MISSING_OR_INVALID',
      exactSha: false,
      accepted: false,
      reason: result.error,
    };
  }

  const document = result.document;
  const status = normaliseStatus(firstValue(document, ['status', 'outcome', 'result', 'decision']));
  const evidenceSha = String(
    firstValue(document, [
      'sourceSha',
      'source_sha',
      'deploymentSha',
      'deployment_sha',
      'targetSha',
      'target_sha',
      'commitSha',
      'commit_sha',
      'buildSha',
      'build_sha',
    ]) ?? '',
  ).trim();
  const exactSha = expectedSha !== 'UNKNOWN_SOURCE_SHA' && evidenceSha === expectedSha;
  const statusPass = PASS_VALUES.has(status);

  return {
    path: repositoryPath,
    exists: true,
    validJson: true,
    status: status || 'NOT_VERIFIED',
    evidenceSha: evidenceSha || null,
    exactSha,
    accepted: statusPass && exactSha,
    reason: !statusPass ? 'status_not_pass' : !exactSha ? 'exact_sha_not_proven' : null,
  };
}

function inspectHumanReview(root, requirement, expectedSha, now) {
  const repositoryPath = requirement.acceptedPath;
  const result = readJson(root, repositoryPath);
  if (!result.exists || !result.valid) {
    return {
      id: requirement.id,
      weight: requirement.weight,
      path: repositoryPath,
      exists: result.exists,
      validJson: result.valid,
      status: 'HUMAN_REVIEW_REQUIRED',
      accepted: false,
      failures: [result.error],
    };
  }

  const document = result.document;
  const requiredFields = {
    reviewerName: ['reviewerName', 'reviewer_name'],
    professionalRegistration: ['professionalRegistration', 'professional_registration'],
    jurisdiction: ['jurisdiction'],
    qualificationScope: ['qualificationScope', 'qualification_scope'],
    conflictAssessment: ['conflictAssessment', 'conflict_assessment'],
    independenceDeclaration: ['independenceDeclaration', 'independence_declaration'],
    reviewScope: ['reviewScope', 'review_scope'],
    productSha: ['productSha', 'product_sha', 'sourceSha', 'source_sha'],
    evidencePackageDigest: ['evidencePackageDigest', 'evidence_package_digest'],
    decision: ['decision', 'status'],
    validityStart: ['validityStart', 'validity_start'],
    validityEnd: ['validityEnd', 'validity_end'],
    signedArtifactReference: ['signedArtifactReference', 'signed_artifact_reference'],
    decisionDigest: ['decisionDigest', 'decision_digest'],
    timestamp: ['timestamp', 'reviewedAt', 'reviewed_at'],
  };

  const failures = [];
  for (const [label, keys] of Object.entries(requiredFields)) {
    const value = firstValue(document, keys);
    if (value === null) failures.push(`missing_${label}`);
    else if (containsPlaceholder(value)) failures.push(`placeholder_${label}`);
  }

  const productSha = String(firstValue(document, requiredFields.productSha) ?? '').trim();
  if (expectedSha === 'UNKNOWN_SOURCE_SHA' || productSha !== expectedSha) failures.push('exact_sha_mismatch');

  const decision = normaliseStatus(firstValue(document, requiredFields.decision));
  if (!ACCEPTED_DECISIONS.has(decision)) failures.push('decision_not_accepted');

  const validFromRaw = firstValue(document, requiredFields.validityStart);
  const validUntilRaw = firstValue(document, requiredFields.validityEnd);
  const validFrom = validFromRaw ? new Date(String(validFromRaw)) : null;
  const validUntil = validUntilRaw ? new Date(String(validUntilRaw)) : null;
  if (!validFrom || Number.isNaN(validFrom.getTime()) || validFrom > now) failures.push('validity_not_started');
  if (!validUntil || Number.isNaN(validUntil.getTime()) || validUntil < now) failures.push('review_expired');

  if (containsPlaceholder(document)) failures.push('document_contains_placeholder');

  return {
    id: requirement.id,
    weight: requirement.weight,
    path: repositoryPath,
    exists: true,
    validJson: true,
    status: failures.length === 0 ? 'COUNSEL_ACCEPTED' : 'HUMAN_REVIEW_REQUIRED',
    accepted: failures.length === 0,
    reviewerName: firstValue(document, requiredFields.reviewerName),
    productSha: productSha || null,
    decision: decision || null,
    failures: [...new Set(failures)].sort(),
  };
}

function calculateWeightedCoverage(workstreams, field) {
  const achieved = workstreams.reduce((total, workstream) => {
    const evidence = workstream[field] ?? [];
    if (evidence.length === 0) return total + workstream.weight;
    return evidence.every((item) => item.exists) ? total + workstream.weight : total;
  }, 0);
  return Number(achieved.toFixed(2));
}

export function auditLegalTruth({
  root = process.cwd(),
  now = new Date(process.env.LEGAL_AUDIT_NOW || new Date().toISOString()),
  sourceSha = resolveSourceSha(root),
} = {}) {
  const registries = Object.fromEntries(
    Object.entries(REGISTRY_PATHS).map(([name, repositoryPath]) => [name, readJson(root, repositoryPath)]),
  );

  const registryFailures = Object.entries(registries)
    .filter(([, result]) => !result.exists || !result.valid)
    .map(([name, result]) => `${name}:${result.error}`);

  if (registryFailures.length > 0) {
    throw new Error(`legal_truth_audit_registry_failure:${registryFailures.join(',')}`);
  }

  const coverageRegistry = registries.coverage.document;
  const qualifiedRegistry = registries.qualifiedReviews.document;
  const closureRegistry = registries.closure.document;
  const articleMatrix = registries.articleMatrix.document;

  const workstreams = coverageRegistry.workstreams.map((workstream) => ({
    id: workstream.id,
    weight: workstream.weight,
    implementationEvidence: (workstream.implementationEvidence ?? []).map((path) => inspectPath(root, path)),
    testEvidence: (workstream.testEvidence ?? []).map((path) => inspectPath(root, path)),
    runtimeEvidence: (workstream.runtimeEvidence ?? []).map((path) => inspectRuntimeEvidence(root, path, sourceSha)),
    humanReviewEvidence: (workstream.humanReviewEvidence ?? []).map((path) => inspectPath(root, path)),
  }));

  const humanReviews = qualifiedRegistry.requirements.map((requirement) =>
    inspectHumanReview(root, requirement, sourceSha, now),
  );

  const allReferencedPaths = [
    ...workstreams.flatMap((item) => item.implementationEvidence),
    ...workstreams.flatMap((item) => item.testEvidence),
    ...workstreams.flatMap((item) => item.runtimeEvidence),
    ...workstreams.flatMap((item) => item.humanReviewEvidence),
  ];

  const missingPaths = [...new Set(allReferencedPaths.filter((item) => !item.exists).map((item) => item.path))].sort();
  const acceptedHumanReviewWeight = humanReviews
    .filter((item) => item.accepted)
    .reduce((total, item) => total + item.weight, 0);
  const referencedHumanReviewWeight = humanReviews.reduce((total, item) => total + item.weight, 0);
  const runtimeAcceptedWeight = workstreams.reduce((total, workstream) => {
    const evidence = workstream.runtimeEvidence;
    if (evidence.length === 0) return total + workstream.weight;
    return evidence.every((item) => item.accepted) ? total + workstream.weight : total;
  }, 0);

  const inconsistentHumanReviewStatuses = (articleMatrix.entries ?? [])
    .filter((entry) => (entry.humanReviewEvidence ?? []).length > 0)
    .filter((entry) => entry.status !== 'HUMAN_REVIEW_REQUIRED')
    .map((entry) => ({ article: entry.article, status: entry.status, evidence: entry.humanReviewEvidence }));

  const closureHumanRequirements = (closureRegistry.requirements ?? []).filter(
    (requirement) => requirement.kind === 'human_review',
  );
  const closureReferencesUnknownReview = closureHumanRequirements.filter(
    (requirement) => !humanReviews.some((review) => review.path === requirement.path),
  );

  return {
    schema: 'risck-comply.legal-baseline-truth-report.v1',
    generatedAt: now.toISOString(),
    repository: 'renanescola40-afk/eurocomply_saas',
    sourceSha,
    legalRulesVersion: coverageRegistry.version,
    legalRulesVerifiedDate: coverageRegistry.lastVerifiedDate,
    regulation: articleMatrix.regulation,
    totals: {
      workstreams: coverageRegistry.workstreams.length,
      totalWeight: coverageRegistry.totalWeight,
      implementationPathCoverageWeight: calculateWeightedCoverage(workstreams, 'implementationEvidence'),
      testPathCoverageWeight: calculateWeightedCoverage(workstreams, 'testEvidence'),
      runtimePathCoverageWeight: calculateWeightedCoverage(workstreams, 'runtimeEvidence'),
      runtimeExactShaAcceptedWeight: Number(runtimeAcceptedWeight.toFixed(2)),
      humanReviewReferencedWeight: referencedHumanReviewWeight,
      humanReviewAcceptedWeight: acceptedHumanReviewWeight,
      readyForCounselPreparationWeight: referencedHumanReviewWeight,
    },
    truth: {
      acceptedReviewFilesExpected: humanReviews.length,
      acceptedReviewFilesPresent: humanReviews.filter((item) => item.exists).length,
      acceptedReviewFilesValid: humanReviews.filter((item) => item.accepted).length,
      humanLegalAcceptancePercent: referencedHumanReviewWeight === 0
        ? 0
        : Number(((acceptedHumanReviewWeight / referencedHumanReviewWeight) * 100).toFixed(1)),
      counselAccepted: acceptedHumanReviewWeight === referencedHumanReviewWeight && referencedHumanReviewWeight > 0,
      formalConformityStatus: 'NOT_ASSESSED',
      customerSpecificComplianceStatus: 'NOT_ASSESSED',
    },
    humanReviews,
    workstreams,
    missingPaths,
    inconsistencies: {
      articleRowsGrantingCreditWithoutRequiredHumanReview: inconsistentHumanReviewStatuses,
      closureRequirementsWithoutQualifiedReviewDefinition: closureReferencesUnknownReview,
    },
    blockers: {
      controlled: [
        ...missingPaths.filter((path) => !path.startsWith('docs/compliance/evidence/accepted/')),
        ...inconsistentHumanReviewStatuses.map((entry) => `article_matrix:${entry.article}:${entry.status}`),
      ].sort(),
      founderFacts: ['legal_entity_identity', 'commercial_terms', 'active_subprocessors', 'support_and_incident_commitments'],
      human: humanReviews.filter((item) => !item.accepted).map((item) => item.id),
      externalOrCustomer: ['customer_specific_legal_assessment', 'formal_conformity_assessment_when_applicable'],
    },
    status: acceptedHumanReviewWeight === referencedHumanReviewWeight && missingPaths.length === 0
      ? 'COUNSEL_ACCEPTED'
      : 'READY_FOR_COUNSEL_PREPARATION_IN_PROGRESS',
  };
}

export function renderMarkdown(report) {
  const missingHuman = report.humanReviews.filter((item) => !item.accepted);
  const missingControlled = report.blockers.controlled;
  return `# Baseline Truth Report\n\n` +
    `- Repository: \`${report.repository}\`\n` +
    `- Source SHA: \`${report.sourceSha}\`\n` +
    `- Generated: ${report.generatedAt}\n` +
    `- Legal source baseline: ${report.regulation}\n` +
    `- Legal-rules version: \`${report.legalRulesVersion}\`\n\n` +
    `## Truth summary\n\n` +
    `| Metric | Result |\n|---|---:|\n` +
    `| Workstreams | ${report.totals.workstreams} |\n` +
    `| Total weight | ${report.totals.totalWeight} |\n` +
    `| Implementation path coverage weight | ${report.totals.implementationPathCoverageWeight} |\n` +
    `| Test path coverage weight | ${report.totals.testPathCoverageWeight} |\n` +
    `| Runtime path coverage weight | ${report.totals.runtimePathCoverageWeight} |\n` +
    `| Runtime exact-SHA accepted weight | ${report.totals.runtimeExactShaAcceptedWeight} |\n` +
    `| Human review referenced weight | ${report.totals.humanReviewReferencedWeight} |\n` +
    `| Human review accepted weight | ${report.totals.humanReviewAcceptedWeight} |\n` +
    `| Human legal acceptance | ${report.truth.humanLegalAcceptancePercent}% |\n\n` +
    `## Human review boundary\n\n` +
    (missingHuman.length === 0
      ? `All qualified review packages passed the evidence gate.\n`
      : missingHuman.map((item) => `- **${item.id}** — \`${item.path}\`: ${item.status} (${item.failures.join(', ')})`).join('\n') + '\n') +
    `\n## Controlled gaps\n\n` +
    (missingControlled.length === 0 ? `No repository-controlled gaps detected.\n` : missingControlled.map((item) => `- ${item}`).join('\n') + '\n') +
    `\n## Required classifications\n\n` +
    `- Technical evidence is not legal acceptance.\n` +
    `- A registry path is not evidence.\n` +
    `- Missing or invalid qualified review remains \`HUMAN_REVIEW_REQUIRED\`.\n` +
    `- Customer-specific compliance and formal conformity are not assessed by this report.\n`;
}

export function writeReport(report, root = process.cwd()) {
  const jsonPath = join(root, OUTPUT_PATHS.json);
  const markdownPath = join(root, OUTPUT_PATHS.markdown);
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownPath, renderMarkdown(report));
  return {
    json: relative(root, jsonPath),
    markdown: relative(root, markdownPath),
  };
}

function main() {
  const root = process.cwd();
  const report = auditLegalTruth({ root });
  const shouldWrite = process.argv.includes('--write');
  const strict = process.argv.includes('--strict');
  if (shouldWrite) writeReport(report, root);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (strict && report.inconsistencies.articleRowsGrantingCreditWithoutRequiredHumanReview.length > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
