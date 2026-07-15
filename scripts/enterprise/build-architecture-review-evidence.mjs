#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_REPOSITORY = 'renanescola40-afk/eurocomply_saas';
const DEFAULT_DECISIONS_DIR = 'docs/decisions';
const DEFAULT_EVIDENCE_PATH = 'docs/security/evidence/release/architecture-review.json';
const FULL_SHA = /^[a-f0-9]{40}$/;
const DATED_ADR_FILE = /^ADR-(\d{4}-\d{2}-\d{2})-[a-z0-9][a-z0-9-]*\.md$/i;
const NUMBERED_ADR_FILE = /^ADR-(\d{4})-[a-z0-9][a-z0-9-]*\.md$/i;
const DATED_DECISION_FILE = /^(\d{4}-\d{2}-\d{2})-[a-z0-9][a-z0-9-]*\.md$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_STATUSES = new Set(['Proposed', 'Accepted', 'Superseded', 'Deprecated']);
const REQUIRED_TOP_LEVEL_SECTIONS = ['Context', 'Decision', 'Rollback'];

function normalizeNewlines(value) {
  return String(value).replace(/\r\n/g, '\n');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sectionBody(content, title) {
  const match = content.match(
    new RegExp(`^##\\s+${escapeRegExp(title)}\\s*$([\\s\\S]*?)(?=^##\\s+|\\z)`, 'mi'),
  );
  return match?.[1]?.trim() ?? null;
}

function extractMetadata(content, field) {
  const inline = content.match(
    new RegExp(`^(?:-\\s+)?\\*{0,2}${escapeRegExp(field)}\\s*:\\*{0,2}\\s*(.+)$`, 'mi'),
  );
  if (inline?.[1]) return inline[1].replace(/\*+$/g, '').trim();

  const body = sectionBody(content, field);
  if (!body) return null;
  const firstLine = body.split('\n').map((line) => line.trim()).find(Boolean) ?? '';

  if (field === 'Status') {
    return [...ALLOWED_STATUSES].find((status) => new RegExp(`^${status}(?:\\.|\\s|$)`, 'i').test(firstLine)) ?? null;
  }
  if (field === 'Date') return firstLine.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
  return firstLine || null;
}

function hasSection(content, title, level = '##') {
  return new RegExp(`^${level}\\s+${escapeRegExp(title)}\\s*$`, 'mi').test(content);
}

function hasRiskTradeoffCoverage(content) {
  const directSections = [
    'Risks and trade-offs',
    'Risks',
    'Trade-offs',
    'Alternatives considered',
    'Rejected alternatives',
    'Candidate options',
  ];
  if (directSections.some((title) => hasSection(content, title))) return true;

  if (!hasSection(content, 'Consequences')) return false;
  return /^###\s+.*(?:trade-offs?|risks?).*$/mi.test(content)
    || /^(?:Trade-offs?|Risks?)\s*:\s*$/mi.test(content);
}

function classifyDecisionFilename(filename) {
  // Dated ADRs must be checked first. Otherwise ADR-2026-07-14-* is
  // incorrectly interpreted as numbered ADR 2026.
  const datedAdr = DATED_ADR_FILE.exec(filename);
  if (datedAdr) {
    return {
      format: 'dated-adr',
      identity: filename.replace(/\.md$/i, ''),
      number: null,
      dateHint: datedAdr[1],
    };
  }

  const numbered = NUMBERED_ADR_FILE.exec(filename);
  if (numbered) {
    return {
      format: 'numbered',
      identity: `ADR-${numbered[1]}`,
      number: numbered[1],
      dateHint: null,
    };
  }

  const datedDecision = DATED_DECISION_FILE.exec(filename);
  if (datedDecision) {
    return {
      format: 'dated-decision',
      identity: filename.replace(/\.md$/i, ''),
      number: null,
      dateHint: datedDecision[1],
    };
  }

  return null;
}

export function scanArchitectureDecisions({ decisionsDir = DEFAULT_DECISIONS_DIR, minimumDecisions = 10 } = {}) {
  const failures = [];
  const decisions = [];

  if (!existsSync(decisionsDir)) {
    return {
      passed: false,
      failures: [`architecture decision directory is missing: ${decisionsDir}`],
      decisions,
      aggregateDigest: null,
    };
  }

  const filenames = readdirSync(decisionsDir)
    .filter((name) => name.endsWith('.md') && name.toLowerCase() !== 'template.md')
    .sort((left, right) => left.localeCompare(right));
  const seenIdentities = new Set();
  const aggregate = createHash('sha256');

  for (const filename of filenames) {
    const classification = classifyDecisionFilename(filename);
    if (!classification) {
      failures.push(`${filename} is not a supported numbered or dated architecture decision filename`);
      continue;
    }

    if (seenIdentities.has(classification.identity)) {
      failures.push(`${filename} duplicates architecture decision identity ${classification.identity}`);
    }
    seenIdentities.add(classification.identity);

    const filePath = join(decisionsDir, filename);
    const content = normalizeNewlines(readFileSync(filePath, 'utf8'));
    const status = extractMetadata(content, 'Status');
    const date = extractMetadata(content, 'Date') ?? classification.dateHint;
    const missingSections = REQUIRED_TOP_LEVEL_SECTIONS.filter((section) => !hasSection(content, section));
    if (!hasRiskTradeoffCoverage(content)) missingSections.push('risk or trade-off coverage');

    if (content.trim().length < 300) failures.push(`${filename} is too short to be a reviewable decision record`);
    if (!status || !ALLOWED_STATUSES.has(status)) failures.push(`${filename} has an invalid or missing Status`);
    if (!date || !ISO_DATE.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00.000Z`))) {
      failures.push(`${filename} has an invalid or missing Date`);
    }
    if (missingSections.length > 0) {
      failures.push(`${filename} is missing section(s): ${missingSections.join(', ')}`);
    }

    const digest = createHash('sha256').update(content).digest('hex');
    aggregate.update(`${filename}\0${digest}\n`);
    decisions.push({
      path: filePath.replaceAll('\\', '/'),
      identity: classification.identity,
      format: classification.format,
      number: classification.number,
      status,
      date,
      digest,
      requiredSectionsPresent: missingSections.length === 0,
    });
  }

  if (decisions.length < minimumDecisions) {
    failures.push(`expected at least ${minimumDecisions} architecture decisions, found ${decisions.length}`);
  }

  return {
    passed: failures.length === 0,
    failures,
    decisions,
    aggregateDigest: aggregate.digest('hex'),
  };
}

export function buildArchitectureReviewEvidence({
  scan = null,
  generatedAt = new Date().toISOString(),
  repository = process.env.GITHUB_REPOSITORY ?? '',
  branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '',
  targetSha = process.env.TARGET_SHA || process.env.GITHUB_SHA || '',
  observedSha = '',
  runId = process.env.GITHUB_RUN_ID ?? '',
  githubActions = process.env.GITHUB_ACTIONS === 'true',
  evidencePath = DEFAULT_EVIDENCE_PATH,
} = {}) {
  const provenanceFailures = [];
  if (!githubActions) provenanceFailures.push('evidence must be generated by GitHub Actions');
  if (repository !== CANONICAL_REPOSITORY) provenanceFailures.push('repository must be canonical');
  if (!FULL_SHA.test(targetSha)) provenanceFailures.push('targetSha must be a full Git SHA');
  if (observedSha !== targetSha) provenanceFailures.push('checked-out SHA must equal targetSha');
  if (!/^\d+$/.test(String(runId))) provenanceFailures.push('runId must be numeric');

  const failures = [...(scan?.failures ?? []), ...provenanceFailures];
  const passed = scan?.passed === true && failures.length === 0;
  const statusCounts = {};
  const formatCounts = {};
  for (const decision of scan?.decisions ?? []) {
    const statusKey = decision.status ?? 'Unknown';
    const formatKey = decision.format ?? 'unknown';
    statusCounts[statusKey] = (statusCounts[statusKey] ?? 0) + 1;
    formatCounts[formatKey] = (formatCounts[formatKey] ?? 0) + 1;
  }

  return {
    schema: 'risck-comply.architecture-review-evidence.v1',
    evidenceItem: 'architecture-review',
    status: passed ? 'Complete' : 'Open',
    outcome: passed ? 'passed' : 'not_verified',
    generatedAt,
    reviewedAt: generatedAt,
    reviewer: 'RISCK COMPLY architecture evidence automation',
    repository,
    branch,
    targetSha,
    observedSha,
    githubRunId: String(runId),
    summary: passed
      ? `Validated ${scan.decisions.length} architecture decision records with required metadata, decision rationale, risk or trade-off coverage, and rollback guidance.`
      : 'Architecture decision evidence is incomplete or lacks trusted exact-SHA provenance.',
    checks: [
      { name: 'decisionInventoryPresent', passed: (scan?.decisions?.length ?? 0) >= 10 },
      { name: 'decisionMetadataValid', passed: !(scan?.failures ?? []).some((item) => /Status|Date/.test(item)) },
      { name: 'decisionSectionsValid', passed: !(scan?.failures ?? []).some((item) => /missing section|too short/.test(item)) },
      { name: 'decisionIdentitiesUnique', passed: !(scan?.failures ?? []).some((item) => /duplicates architecture decision identity/.test(item)) },
      { name: 'supportedHistoricalFormatsOnly', passed: !(scan?.failures ?? []).some((item) => /not a supported/.test(item)) },
      { name: 'exactShaProvenance', passed: provenanceFailures.length === 0 },
    ],
    decisionInventory: {
      count: scan?.decisions?.length ?? 0,
      statusCounts,
      formatCounts,
      aggregateDigest: scan?.aggregateDigest ?? null,
      paths: (scan?.decisions ?? []).map((decision) => decision.path),
    },
    controlsVerified: passed ? ['Architecture decisions recorded'] : [],
    failures,
    evidenceLocations: [DEFAULT_DECISIONS_DIR, 'scripts/enterprise/build-architecture-review-evidence.mjs', evidencePath],
    redactionConfirmation: 'Evidence contains only repository paths, decision metadata, counts and cryptographic content digests. No secrets, customer data, credentials or provider payloads are stored.',
    evidenceIntegrity: {
      containsSensitiveValues: false,
      rawDecisionContentStored: false,
      exactShaBound: passed,
      generatedByProtectedAutomation: githubActions,
    },
  };
}

function gitHead(repositoryRoot) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function runCli() {
  const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const decisionsDir = join(repositoryRoot, process.env.ARCHITECTURE_DECISIONS_DIR || DEFAULT_DECISIONS_DIR);
  const evidenceRelativePath = process.env.ARCHITECTURE_EVIDENCE_PATH || DEFAULT_EVIDENCE_PATH;
  const evidencePath = join(repositoryRoot, evidenceRelativePath);
  const minimumDecisions = Number.parseInt(process.env.ARCHITECTURE_MINIMUM_DECISIONS || '10', 10);
  const scan = scanArchitectureDecisions({ decisionsDir, minimumDecisions });
  const evidence = buildArchitectureReviewEvidence({
    scan: {
      ...scan,
      decisions: scan.decisions.map((decision) => ({
        ...decision,
        path: relative(repositoryRoot, resolve(decision.path)).replaceAll('\\', '/'),
      })),
    },
    repository: process.env.GITHUB_REPOSITORY ?? '',
    branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '',
    targetSha: process.env.TARGET_SHA || process.env.GITHUB_SHA || '',
    observedSha: gitHead(repositoryRoot),
    runId: process.env.GITHUB_RUN_ID ?? '',
    githubActions: process.env.GITHUB_ACTIONS === 'true',
    evidencePath: evidenceRelativePath,
  });

  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Wrote ${evidenceRelativePath} with status ${evidence.status}/${evidence.outcome}`);
  if (evidence.status !== 'Complete') {
    for (const failure of evidence.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) runCli();
