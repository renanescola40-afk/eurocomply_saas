#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const OUTPUT_JSON = 'artifacts/legal-review/counsel-handoff-bundle.json';
const OUTPUT_MARKDOWN = 'artifacts/legal-review/counsel-handoff-bundle.md';

const CORE_PATHS = Object.freeze([
  'docs/legal-review-preparation/00_BASELINE_TRUTH_REPORT.md',
  'docs/legal-review-preparation/01_PRODUCT_DOSSIER.md',
  'docs/legal-review-preparation/02_INTENDED_PURPOSE.md',
  'docs/legal-review-preparation/03_ARCHITECTURE_AND_DATA_FLOWS.md',
  'docs/legal-review-preparation/04_FEATURE_AND_ROUTE_INVENTORY.md',
  'docs/legal-review-preparation/05_SECURITY_CONTROL_MAP.md',
  'docs/legal-review-preparation/06_RISCK_COMPLY_AI_ACT_CLASSIFICATION_MEMO.md',
  'docs/legal-review-preparation/06_RISCK_COMPLY_AI_ACT_CLASSIFICATION_MEMO.json',
  'docs/legal-review-preparation/07_LEGAL_SOURCE_REGISTER.json',
  'docs/legal-review-preparation/08_ARTICLE_FUNCTION_EVIDENCE_MATRIX.md',
  'docs/legal-review-preparation/08_ARTICLE_FUNCTION_EVIDENCE_MATRIX.json',
  'docs/legal-review-preparation/09_QUALIFIED_REVIEW_PACKAGES_STATUS.md',
  'docs/legal-review-preparation/10_FOUNDER_FACTS_QUESTIONNAIRE.md',
  'docs/legal-review-preparation/11_CONTRACT_AND_COUNSEL_PACK_STATUS.md',
  'docs/legal-review-preparation/12_FINAL_LEGAL_PUBLICATION_GATE.md',
  'docs/legal-review-preparation/13_COUNSEL_REVIEW_EFFICIENCY_CLOSEOUT.md',
  'docs/legal-review-preparation/FOUNDER_FACTS_TEMPLATE.json',
  'docs/legal-review-preparation/QUALIFIED_REVIEW_DECISION_TEMPLATE.json',
  'docs/legal-review-preparation/review-package-schema.v1.json',
  'docs/compliance/eu-ai-act-product-coverage-registry.json',
  'docs/compliance/article-function-evidence-registry.v1.json',
  'docs/compliance/evidence/qualified-review-execution-registry.json',
  'docs/compliance/evidence/enterprise-evidence-closure-registry.json',
]);

const PACKAGE_DIRECTORIES = Object.freeze([
  'docs/legal-review-preparation/review-packages',
  'docs/legal-review-preparation/legal-pack',
  'docs/legal-review-preparation/counsel-efficiency',
  'docs/legal-review-preparation/free-counsel',
]);

const REQUIRED_EXTERNAL_DECISIONS = Object.freeze([
  'docs/compliance/evidence/accepted/founder-facts.json',
  'docs/compliance/evidence/accepted/legal-rules-qualified-review.json',
  'docs/compliance/evidence/accepted/prohibited-practices-legal-review.json',
  'docs/compliance/evidence/accepted/article-50-copy-review.json',
  'docs/compliance/evidence/accepted/fria-methodology-review.json',
  'docs/compliance/evidence/accepted/deployer-obligations-legal-review.json',
  'docs/compliance/evidence/accepted/high-risk-provider-methodology-review.json',
  'docs/compliance/evidence/accepted/conformity-qualified-review.json',
  'docs/compliance/evidence/accepted/gpai-legal-review.json',
  'docs/compliance/evidence/accepted/master-legal-decision.json',
]);

function resolveSha(root) {
  const explicit =
    process.env.LEGAL_PUBLICATION_EXPECTED_SHA?.trim() ||
    process.env.GITHUB_HEAD_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim();
  if (explicit) return explicit;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN_SOURCE_SHA';
  }
}

function filesUnder(root, repositoryPath) {
  const absolutePath = join(root, repositoryPath);
  if (!existsSync(absolutePath)) return [];
  if (!statSync(absolutePath).isDirectory()) return [repositoryPath];

  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const child = join(repositoryPath, entry.name);
    return entry.isDirectory() ? filesUnder(root, child) : [child];
  });
}

function sha256(root, repositoryPath) {
  return `sha256:${createHash('sha256')
    .update(readFileSync(join(root, repositoryPath)))
    .digest('hex')}`;
}

function contentClass(path) {
  if (path.includes('/review-packages/')) return 'QUALIFIED_REVIEW_PACKAGE';
  if (path.includes('/legal-pack/')) return 'CONTRACT_AND_COUNSEL_DRAFT';
  if (path.includes('/counsel-efficiency/')) return 'COUNSEL_REVIEW_EFFICIENCY';
  if (path.includes('/free-counsel/')) return 'FREE_COUNSEL_REVIEW_HANDOFF';
  if (path.includes('/evidence/')) return 'EVIDENCE_REGISTRY';
  if (path.endsWith('.json')) return 'STRUCTURED_LEGAL_PREPARATION';
  return 'COUNSEL_BRIEFING';
}

export function generateLegalCounselHandoffBundle({
  root = process.cwd(),
  sourceSha = resolveSha(root),
  generatedAt = new Date(),
} = {}) {
  const candidatePaths = [
    ...CORE_PATHS,
    ...PACKAGE_DIRECTORIES.flatMap((path) => filesUnder(root, path)),
  ];
  const uniquePaths = [...new Set(candidatePaths)].sort();
  const missingPreparationPaths = uniquePaths.filter(
    (path) => !existsSync(join(root, path)),
  );
  const files = uniquePaths
    .filter((path) => existsSync(join(root, path)))
    .map((path) => ({
      path,
      class: contentClass(path),
      bytes: statSync(join(root, path)).size,
      sha256: sha256(root, path),
    }));

  const packageDigest = `sha256:${createHash('sha256')
    .update(
      files
        .map((file) => `${file.path}:${file.sha256}:${file.bytes}`)
        .sort()
        .join('\n'),
    )
    .digest('hex')}`;

  const externalDecisionStatus = REQUIRED_EXTERNAL_DECISIONS.map((path) => ({
    path,
    present: existsSync(join(root, path)),
    includedInBundle: false,
    reason: 'Signed or confidential decisions are validated separately and are not bundled into repository preparation artifacts.',
  }));

  return {
    schema: 'risck-comply.counsel-handoff-bundle.v1',
    generatedAt: generatedAt.toISOString(),
    repository: 'renanescola40-afk/eurocomply_saas',
    sourceSha,
    packageDigest,
    preparationStatus:
      missingPreparationPaths.length === 0
        ? 'READY_FOR_COUNSEL_HANDOFF'
        : 'HANDOFF_PREPARATION_INCOMPLETE',
    reviewEfficiencyStatus:
      files.some((file) => file.class === 'COUNSEL_REVIEW_EFFICIENCY')
        ? 'DELTA_REVIEW_SUPPORTED'
        : 'FULL_DISCOVERY_REVIEW_REQUIRED',
    legalAcceptanceStatus: 'HUMAN_REVIEW_REQUIRED',
    fileCount: files.length,
    totalBytes: files.reduce((total, file) => total + file.bytes, 0),
    missingPreparationPaths,
    files,
    externalDecisionStatus,
    instructions: [
      'Start with the counsel review cockpit and generated exact-SHA delta.',
      'Use the free-counsel handoff files when the reviewer is operating under a pro bono, clinic or zero-cost limited-scope route.',
      'Counsel must review source materials rather than rely only on generated summaries.',
      'Bind every decision to sourceSha and packageDigest.',
      'Store signed confidential artifacts outside the public repository and reference immutable digests.',
      'Do not infer acceptance from package completeness, CI success or silence.',
    ],
  };
}

export function renderHandoffMarkdown(bundle) {
  return `# Counsel Handoff Bundle\n\n` +
    `- Source SHA: \`${bundle.sourceSha}\`\n` +
    `- Package digest: \`${bundle.packageDigest}\`\n` +
    `- Preparation status: \`${bundle.preparationStatus}\`\n` +
    `- Review efficiency: \`${bundle.reviewEfficiencyStatus}\`\n` +
    `- Legal acceptance: \`${bundle.legalAcceptanceStatus}\`\n` +
    `- Files: ${bundle.fileCount}\n\n` +
    `## Included preparation files\n\n` +
    bundle.files.map((file) => `- \`${file.path}\` — ${file.sha256}`).join('\n') +
    `\n\n## External decisions not bundled\n\n` +
    bundle.externalDecisionStatus.map((item) => `- \`${item.path}\` — ${item.present ? 'present but excluded' : 'required and absent'}`).join('\n') +
    `\n\nPackage completeness and delta routing are not legal acceptance.\n`;
}

export function writeLegalCounselHandoffBundle(bundle, root = process.cwd()) {
  const jsonPath = join(root, OUTPUT_JSON);
  const markdownPath = join(root, OUTPUT_MARKDOWN);
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(bundle, null, 2)}\n`);
  writeFileSync(markdownPath, renderHandoffMarkdown(bundle));
  return {
    json: relative(root, jsonPath),
    markdown: relative(root, markdownPath),
  };
}

function main() {
  const bundle = generateLegalCounselHandoffBundle();
  if (process.argv.includes('--write')) writeLegalCounselHandoffBundle(bundle);
  process.stdout.write(`${JSON.stringify(bundle, null, 2)}\n`);
  if (process.argv.includes('--strict') && bundle.missingPreparationPaths.length > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
