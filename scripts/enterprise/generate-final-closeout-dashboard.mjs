#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PRODUCT_REGISTRY = join(ROOT, 'docs/compliance/eu-ai-act-product-coverage-registry.json');
const CLOSURE_REGISTRY = join(ROOT, 'docs/compliance/evidence/enterprise-evidence-closure-registry.json');
const OUTPUT_DIR = join(ROOT, 'artifacts/enterprise-final-closeout');
const JSON_OUTPUT = join(OUTPUT_DIR, 'final-closeout-dashboard.json');
const MD_OUTPUT = join(OUTPUT_DIR, 'final-closeout-dashboard.md');
const FULL_SHA = /^[a-f0-9]{40}$/;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function evidenceRoots() {
  const configured = String(process.env.ENTERPRISE_EVIDENCE_ROOTS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => resolve(ROOT, item));
  return [ROOT, ...configured];
}

function findEvidence(path) {
  for (const root of evidenceRoots()) {
    const candidate = join(root, path);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function statusOf(document) {
  const status = String(document?.status ?? '').toLowerCase();
  const outcome = String(document?.outcome ?? '').toLowerCase();
  const decision = String(document?.decision ?? '').toLowerCase();
  if (['pass', 'passed', 'complete', 'success', 'accepted', 'go'].includes(status)) return 'PASS';
  if (['pass', 'passed', 'success', 'accepted', 'go'].includes(outcome)) return 'PASS';
  if (['pass', 'passed', 'success', 'accepted', 'go'].includes(decision)) return 'PASS';
  if (['partial', 'in_progress'].includes(status)) return 'PARTIAL';
  return 'OPEN';
}

function evidenceShaOf(document) {
  const candidates = [
    document?.targetSha,
    document?.observedSha,
    document?.commitSha,
    document?.releaseSha,
    document?.release_sha,
    document?.deploymentSha,
    document?.deployment_sha,
    document?.sourceSha,
    document?.source_sha,
    document?.productSha,
    document?.product_sha,
    document?.sha,
    document?.provenance?.commitSha,
    document?.reviewBinding?.productSha,
  ];
  return candidates.find((candidate) => typeof candidate === 'string' && candidate.trim())?.trim() ?? null;
}

function validateEvidence(path, targetSha, kind) {
  const resolved = findEvidence(path);
  if (!resolved) return { status: 'MISSING', path };

  let document;
  try {
    document = readJson(resolved);
  } catch {
    return { status: 'INVALID', path, reason: 'invalid_json' };
  }

  const evidenceStatus = statusOf(document);
  const sha = evidenceShaOf(document);
  const shaRequired = kind === 'runtime' && Boolean(targetSha);
  const shaMatches = !shaRequired || sha === targetSha;
  const sensitive = document?.evidenceIntegrity?.containsSensitiveValues === true
    || document?.containsSensitiveValues === true;

  if (sensitive) return { status: 'REJECTED', path, reason: 'sensitive_values' };
  if (!shaMatches) return { status: 'REJECTED', path, reason: 'sha_mismatch', observedSha: sha };
  if (evidenceStatus !== 'PASS') return { status: 'OPEN', path, observedSha: sha };

  return {
    status: 'PASS',
    path,
    observedSha: sha,
    digest: digest(JSON.stringify(document)),
  };
}

function sum(items, predicate) {
  return items.filter(predicate).reduce((total, item) => total + item.weight, 0);
}

export function buildDashboard({ productRegistry, closureRegistry, targetSha }) {
  const humanByWorkstream = new Map(
    closureRegistry.requirements
      .filter((item) => item.kind === 'human_review')
      .map((item) => [item.workstream, item.path]),
  );

  const rows = productRegistry.workstreams.map((workstream) => {
    const implementationPresent = [...workstream.implementationEvidence, ...workstream.testEvidence]
      .every((path) => Boolean(findEvidence(path)));
    const runtime = workstream.runtimeEvidence.length === 0
      ? { status: 'NOT_REQUIRED' }
      : validateEvidence(workstream.runtimeEvidence[0], targetSha, 'runtime');
    const reviewPath = humanByWorkstream.get(workstream.id);
    const humanReview = reviewPath
      ? validateEvidence(reviewPath, targetSha, 'human_review')
      : { status: 'NOT_REQUIRED' };
    const complete = implementationPresent
      && ['PASS', 'NOT_REQUIRED'].includes(runtime.status)
      && ['PASS', 'NOT_REQUIRED'].includes(humanReview.status);

    return {
      id: workstream.id,
      name: workstream.name,
      weight: workstream.weight,
      implementation: implementationPresent ? 'PASS' : 'OPEN',
      runtime,
      humanReview,
      complete,
    };
  });

  const implementationScore = sum(rows, (row) => row.implementation === 'PASS');
  const runtimeScore = sum(rows, (row) => ['PASS', 'NOT_REQUIRED'].includes(row.runtime.status));
  const humanReviewScore = sum(rows, (row) => ['PASS', 'NOT_REQUIRED'].includes(row.humanReview.status));
  const completedScore = sum(rows, (row) => row.complete);
  const remainingScore = productRegistry.totalWeight - completedScore;
  const blockers = rows
    .filter((row) => !row.complete)
    .map((row) => ({
      id: row.id,
      weight: row.weight,
      missing: [
        row.implementation !== 'PASS' ? 'implementation' : null,
        !['PASS', 'NOT_REQUIRED'].includes(row.runtime.status) ? 'runtime' : null,
        !['PASS', 'NOT_REQUIRED'].includes(row.humanReview.status) ? 'human_review' : null,
      ].filter(Boolean),
    }))
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));

  return {
    schema: 'risck-comply.enterprise-final-closeout-dashboard.v1',
    generatedAt: new Date().toISOString(),
    repository: 'renanescola40-afk/eurocomply_saas',
    targetSha: targetSha || null,
    exactShaMode: Boolean(targetSha),
    scores: {
      implementation: implementationScore,
      runtime: runtimeScore,
      humanReview: humanReviewScore,
      completed: completedScore,
      remaining: remainingScore,
    },
    decision: completedScore === 100 ? 'ENTERPRISE_GO_CANDIDATE' : 'ENTERPRISE_NO_GO',
    blockers,
    workstreams: rows,
    truthBoundary: 'This report inventories repository and supplied evidence roots. It does not create, fabricate or independently approve runtime, legal, penetration-test, provider or operator evidence.',
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Enterprise Final Closeout Dashboard',
    '',
    `- Target SHA: ${report.targetSha ?? 'not supplied'}`,
    `- Implementation: ${report.scores.implementation}%`,
    `- Runtime evidence: ${report.scores.runtime}%`,
    `- Human-review coverage: ${report.scores.humanReview}%`,
    `- Fully completed: ${report.scores.completed}%`,
    `- Remaining: ${report.scores.remaining}%`,
    `- Decision: \`${report.decision}\``,
    '',
    '## Prioritized blockers',
    '',
    '| Workstream | Weight | Missing |',
    '| --- | ---: | --- |',
    ...report.blockers.map((item) => `| ${item.id} | ${item.weight} | ${item.missing.join(', ')} |`),
    '',
    '## Truth boundary',
    '',
    report.truthBoundary,
    '',
  ];
  return lines.join('\n');
}

function main() {
  const targetSha = String(process.env.ENTERPRISE_TARGET_SHA ?? '').trim();
  if (targetSha && !FULL_SHA.test(targetSha)) {
    throw new Error('ENTERPRISE_TARGET_SHA must be a full lowercase 40-character Git SHA');
  }
  const report = buildDashboard({
    productRegistry: readJson(PRODUCT_REGISTRY),
    closureRegistry: readJson(CLOSURE_REGISTRY),
    targetSha,
  });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(JSON_OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(MD_OUTPUT, `${renderMarkdown(report)}\n`);
  console.log(renderMarkdown(report));
  if (process.argv.includes('--strict') && report.scores.completed !== 100) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
