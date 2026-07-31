#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const CATALOG_PATH = 'docs/legal-review-preparation/counsel-efficiency/COUNSEL_DECISION_CATALOG.json';
const MANIFEST_PATH = 'docs/legal-review-preparation/counsel-efficiency/manifest.json';
const OUTPUT_JSON = 'artifacts/legal-review/counsel-review-delta.json';
const OUTPUT_MARKDOWN = 'artifacts/legal-review/counsel-review-delta.md';

const LEVEL_RANK = Object.freeze({
  NO_COUNSEL_REREVIEW_REQUIRED: 0,
  LIMITED_COUNSEL_REREVIEW_REQUIRED: 1,
  FULL_COUNSEL_REREVIEW_REQUIRED: 2,
});

function readJson(root, path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function normalizeSha(value) {
  const candidate = value?.trim();
  if (!candidate || /^0+$/.test(candidate)) return null;
  return candidate;
}

function resolveRef(root, ref) {
  const normalized = normalizeSha(ref);
  if (!normalized) return null;
  try {
    return git(root, ['rev-parse', normalized]);
  } catch {
    return normalized;
  }
}

function resolveHeadSha(root, explicit) {
  return (
    resolveRef(root, explicit) ||
    resolveRef(root, process.env.COUNSEL_REVIEW_HEAD_SHA) ||
    resolveRef(root, process.env.GITHUB_HEAD_SHA) ||
    resolveRef(root, process.env.GITHUB_SHA) ||
    resolveRef(root, 'HEAD') ||
    'UNKNOWN_HEAD_SHA'
  );
}

function resolveBaseSha(root, explicit) {
  return (
    resolveRef(root, explicit) ||
    resolveRef(root, process.env.COUNSEL_REVIEW_BASE_SHA) ||
    resolveRef(root, process.env.GITHUB_BASE_SHA) ||
    null
  );
}

function listChangedFiles(root, baseSha, headSha) {
  if (!baseSha || !headSha || headSha === 'UNKNOWN_HEAD_SHA') return [];
  try {
    const output = git(root, ['diff', '--name-only', '--diff-filter=ACDMRTUXB', `${baseSha}...${headSha}`]);
    return output ? [...new Set(output.split('\n').map((item) => item.trim()).filter(Boolean))].sort() : [];
  } catch {
    return [];
  }
}

function validateCatalog(catalog) {
  const failures = [];
  if (catalog.schema !== 'risck-comply.counsel-decision-catalog.v1') failures.push('catalog_schema_invalid');
  if (catalog.status !== 'HUMAN_REVIEW_REQUIRED') failures.push('catalog_status_must_require_human_review');
  if (!Array.isArray(catalog.globalDecisions) || catalog.globalDecisions.length !== 10) failures.push('catalog_must_have_ten_global_decisions');
  if (!Array.isArray(catalog.workstreams) || catalog.workstreams.length !== 8) failures.push('catalog_must_have_eight_workstreams');
  if ((catalog.workstreams ?? []).some((item) => item.decision !== 'HUMAN_REVIEW_REQUIRED')) failures.push('catalog_grants_false_workstream_credit');
  if (!Array.isArray(catalog.pathRules) || catalog.pathRules.length === 0) failures.push('catalog_path_rules_missing');
  for (const rule of catalog.pathRules ?? []) {
    if (!(rule.level in LEVEL_RANK)) failures.push(`invalid_level:${rule.id ?? 'unknown'}`);
    if (!Array.isArray(rule.match) || rule.match.length === 0) failures.push(`missing_matchers:${rule.id ?? 'unknown'}`);
  }
  return [...new Set(failures)].sort();
}

function matches(file, token) {
  const normalizedFile = file.toLowerCase();
  const normalizedToken = token.toLowerCase();
  return normalizedFile === normalizedToken || normalizedFile.includes(normalizedToken);
}

function fallbackForUnmatched(file) {
  if (
    file.startsWith('src/') ||
    file.startsWith('supabase/') ||
    file.startsWith('docs/legal-review-preparation/') ||
    file.startsWith('docs/compliance/') ||
    file.startsWith('scripts/compliance/')
  ) {
    return {
      id: 'unclassified-material-path',
      level: 'LIMITED_COUNSEL_REREVIEW_REQUIRED',
      decisions: ['G-10'],
      workstreams: [],
      reason: 'A potentially material product, legal-preparation or compliance path changed without a more specific catalogue rule.',
    };
  }
  return null;
}

export function classifyCounselReviewImpact({ changedFiles, catalog, baseSha, headSha }) {
  const catalogueFailures = validateCatalog(catalog);
  const matchedRuleIds = new Set();
  const affectedDecisionIds = new Set();
  const affectedWorkstreamIds = new Set();
  const unmatchedFiles = [];
  const fallbackMatches = [];
  let reviewLevel = 'NO_COUNSEL_REREVIEW_REQUIRED';

  const workstreamById = new Map((catalog.workstreams ?? []).map((item) => [item.id, item]));

  for (const file of [...new Set(changedFiles)].sort()) {
    const matchesForFile = (catalog.pathRules ?? []).filter((rule) =>
      (rule.match ?? []).some((token) => matches(file, token)),
    );

    if (matchesForFile.length === 0) {
      unmatchedFiles.push(file);
      const fallback = fallbackForUnmatched(file);
      if (fallback) {
        fallbackMatches.push({ file, ...fallback });
        if (LEVEL_RANK[fallback.level] > LEVEL_RANK[reviewLevel]) reviewLevel = fallback.level;
        for (const decision of fallback.decisions) affectedDecisionIds.add(decision);
      }
      continue;
    }

    for (const rule of matchesForFile) {
      matchedRuleIds.add(rule.id);
      if (LEVEL_RANK[rule.level] > LEVEL_RANK[reviewLevel]) reviewLevel = rule.level;
      for (const decision of rule.decisions ?? []) affectedDecisionIds.add(decision);
      for (const workstream of rule.workstreams ?? []) affectedWorkstreamIds.add(workstream);
    }
  }

  let reason = 'No material counsel-review path was changed.';
  if (!baseSha) {
    reviewLevel = 'FULL_COUNSEL_REREVIEW_REQUIRED';
    reason = 'No reviewed base SHA was supplied, so previous legal reliance cannot be scoped safely.';
    for (const decision of catalog.globalDecisions ?? []) affectedDecisionIds.add(decision.id);
    for (const workstream of catalog.workstreams ?? []) affectedWorkstreamIds.add(workstream.id);
  } else if (changedFiles.length === 0) {
    reason = 'No file delta was detected between the supplied SHAs.';
  } else if (reviewLevel === 'FULL_COUNSEL_REREVIEW_REQUIRED') {
    reason = 'At least one change can alter intended purpose, product role, legal-source interpretation or broad review reliance.';
  } else if (reviewLevel === 'LIMITED_COUNSEL_REREVIEW_REQUIRED') {
    reason = 'The changes are material but can be routed to bounded global decisions and workstream packages.';
  }

  const affectedWorkstreams = [...affectedWorkstreamIds]
    .sort()
    .map((id) => workstreamById.get(id) ?? { id, package: null, weight: null, decision: 'HUMAN_REVIEW_REQUIRED' });

  const core = {
    schema: 'risck-comply.counsel-review-delta.v1',
    repository: REPOSITORY,
    baseSha: baseSha ?? null,
    headSha,
    reviewLevel,
    reason,
    changedFiles: [...new Set(changedFiles)].sort(),
    matchedRuleIds: [...matchedRuleIds].sort(),
    fallbackMatches,
    unmatchedFiles,
    affectedDecisionIds: [...affectedDecisionIds].sort(),
    affectedWorkstreams,
    catalogueFailures,
    preparationStatus: catalogueFailures.length === 0 ? 'DELTA_PREPARED' : 'DELTA_PREPARATION_FAILED',
    legalAcceptanceStatus: 'HUMAN_REVIEW_REQUIRED',
    counselAccepted: false,
    instructions: [
      'Counsel may widen or narrow this proposed scope with written reasons.',
      'Review primary sources and affected implementation rather than relying only on generated summaries.',
      'Bind any decision to the exact head SHA and the canonical handoff package digest.',
      'A delta result never creates legal acceptance, certification or customer compliance.',
    ],
  };

  return {
    ...core,
    deltaDigest: sha256(JSON.stringify(core)),
  };
}

export function renderCounselReviewDeltaMarkdown(delta) {
  const workstreams = delta.affectedWorkstreams.length
    ? delta.affectedWorkstreams.map((item) => `- \`${item.id}\` — ${item.package ?? 'package mapping required'}`).join('\n')
    : '- None proposed.';
  const decisions = delta.affectedDecisionIds.length
    ? delta.affectedDecisionIds.map((item) => `- \`${item}\``).join('\n')
    : '- None proposed.';
  const files = delta.changedFiles.length
    ? delta.changedFiles.map((item) => `- \`${item}\``).join('\n')
    : '- No changed files detected or no base SHA supplied.';

  return `# Counsel Review Delta\n\n` +
    `- Base SHA: \`${delta.baseSha ?? 'NOT_SUPPLIED'}\`\n` +
    `- Head SHA: \`${delta.headSha}\`\n` +
    `- Review level: \`${delta.reviewLevel}\`\n` +
    `- Preparation: \`${delta.preparationStatus}\`\n` +
    `- Legal acceptance: \`${delta.legalAcceptanceStatus}\`\n` +
    `- Delta digest: \`${delta.deltaDigest}\`\n\n` +
    `## Reason\n\n${delta.reason}\n\n` +
    `## Changed files\n\n${files}\n\n` +
    `## Global decisions to review\n\n${decisions}\n\n` +
    `## Workstream packages to review\n\n${workstreams}\n\n` +
    `## Truth boundary\n\nThis artifact routes counsel review. It does not approve any legal position.\n`;
}

export function buildCounselReviewDelta({ root = process.cwd(), baseSha, headSha, changedFiles } = {}) {
  if (!existsSync(join(root, CATALOG_PATH))) throw new Error('counsel_decision_catalog_missing');
  if (!existsSync(join(root, MANIFEST_PATH))) throw new Error('counsel_efficiency_manifest_missing');
  const resolvedHead = resolveHeadSha(root, headSha);
  const resolvedBase = resolveBaseSha(root, baseSha);
  const files = changedFiles ?? listChangedFiles(root, resolvedBase, resolvedHead);
  return classifyCounselReviewImpact({
    changedFiles: files,
    catalog: readJson(root, CATALOG_PATH),
    baseSha: resolvedBase,
    headSha: resolvedHead,
  });
}

export function writeCounselReviewDelta(delta, root = process.cwd()) {
  const jsonPath = join(root, OUTPUT_JSON);
  const markdownPath = join(root, OUTPUT_MARKDOWN);
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(delta, null, 2)}\n`);
  writeFileSync(markdownPath, renderCounselReviewDeltaMarkdown(delta));
  return { json: OUTPUT_JSON, markdown: OUTPUT_MARKDOWN };
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function main() {
  const delta = buildCounselReviewDelta({
    baseSha: argumentValue('--base'),
    headSha: argumentValue('--head'),
  });
  if (process.argv.includes('--write')) writeCounselReviewDelta(delta);
  process.stdout.write(`${JSON.stringify(delta, null, 2)}\n`);
  if (process.argv.includes('--strict') && delta.catalogueFailures.length > 0) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
