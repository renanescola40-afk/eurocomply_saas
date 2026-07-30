#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { p0EvidenceCatalog } from './p0-runtime-evidence-catalog.mjs';
import {
  DEFAULT_P0_REGISTER_PATH,
  evaluateP0RuntimeEvidence,
  normalizeP0Item,
} from './evaluate-p0-runtime-evidence.mjs';

const ARTIFACT_DIR = path.join('artifacts', 'security');
const JSON_ARTIFACT = path.join(ARTIFACT_DIR, 'p0-runtime-evidence-register-derived.json');
const MARKDOWN_ARTIFACT = path.join(ARTIFACT_DIR, 'p0-runtime-evidence-register-derived.md');

function escapeMarkdownCell(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\s+/g, ' ')
    .trim();
}

function rowMetadataMap(rows) {
  return new Map(rows.map((row) => [normalizeP0Item(row.item), row]));
}

function findSourceRow(entry, metadataByItem) {
  for (const name of [entry.item, ...(entry.aliases ?? [])]) {
    const row = metadataByItem.get(normalizeP0Item(name));
    if (row) return row;
  }
  return null;
}

export function deriveP0Register({
  evaluation,
  catalog = p0EvidenceCatalog,
  generatedAt = new Date(),
} = {}) {
  if (!evaluation) throw new Error('evaluation is required');

  const metadataByItem = rowMetadataMap(evaluation.registerRows);
  const resultByItem = new Map(
    evaluation.results.map((result) => [normalizeP0Item(result.item), result]),
  );

  const rows = catalog.map((entry) => {
    const source = findSourceRow(entry, metadataByItem);
    if (!source) throw new Error(`missing source register row: ${entry.item}`);

    const result = resultByItem.get(normalizeP0Item(entry.item));
    const derivedStatus = entry.kind === 'runtime'
      ? result?.evidenceSatisfied === true ? 'Complete' : 'Open'
      : source.status;
    const drift = source.status === derivedStatus
      ? 'none'
      : source.status === 'Complete' && derivedStatus !== 'Complete'
        ? 'overclaim'
        : 'underclaim';

    return {
      item: entry.item,
      kind: entry.kind,
      sourceStatus: source.status,
      derivedStatus,
      drift,
      requiredEvidence: source.requiredEvidence,
      owner: source.owner,
      nextAction: derivedStatus === 'Complete'
        ? 'No action; canonical validation passed for the assessed SHA'
        : source.nextAction,
      evidenceFile: result?.evidenceFile ?? null,
      evidenceStatus: result?.evidenceStatus ?? null,
      evidenceOutcome: result?.evidenceOutcome ?? null,
      placeholderOnly: result?.placeholderOnly ?? false,
      validatorFailures: result?.validatorFailures ?? [],
    };
  });

  const complete = rows.filter((row) => row.derivedStatus === 'Complete').length;
  const runtimeRows = rows.filter((row) => row.kind === 'runtime');
  const runtimeComplete = runtimeRows.filter(
    (row) => row.derivedStatus === 'Complete',
  ).length;
  const overclaims = rows.filter((row) => row.drift === 'overclaim');
  const underclaims = rows.filter((row) => row.drift === 'underclaim');
  const decision = complete === rows.length ? 'Go' : 'No-Go';

  return {
    schema: 'risck-comply.p0-runtime-evidence-derived-register.v1',
    generatedAt: generatedAt.toISOString(),
    repository: evaluation.expectedRepository,
    branch: evaluation.expectedBranch,
    assessedCommitSha: evaluation.expectedCommitSha,
    decision,
    status: decision === 'Go' ? 'Complete' : 'Blocked',
    counts: {
      complete,
      total: rows.length,
      runtimeComplete,
      runtimeTotal: runtimeRows.length,
      overclaims: overclaims.length,
      underclaims: underclaims.length,
    },
    overclaims,
    underclaims,
    rows,
    sources: {
      catalog: 'scripts/security/p0-runtime-evidence-catalog.mjs',
      evaluator: 'scripts/security/evaluate-p0-runtime-evidence.mjs',
      committedRegister: DEFAULT_P0_REGISTER_PATH,
    },
  };
}

export function renderP0RegisterMarkdown(derived) {
  const assessedSha = derived.assessedCommitSha ?? 'unavailable';
  const date = derived.generatedAt.slice(0, 10);
  const lines = [
    '# P0 Runtime Evidence Register',
    '',
    `Current final decision: **${derived.decision}**.`,
    '',
    'This register is derived from the canonical P0 catalog and specialist validators. A literal status in an evidence file is never sufficient by itself.',
    '',
    '## Current release assessment',
    '',
    `- Assessment date: ${date}`,
    `- Repository: \`${derived.repository}\``,
    `- Branch: \`${derived.branch}\``,
    `- Assessed commit: \`${assessedSha}\``,
    '- Scope: public production release readiness',
    `- Decision: ${derived.decision} until every release-blocking item below is \`Complete\` for the exact final release commit.`,
    '',
    '## Evidence status',
    '',
    '| Evidence item | Status | Required evidence | Owner | Next action |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const row of derived.rows) {
    lines.push(
      `| ${escapeMarkdownCell(row.item)} | ${row.derivedStatus} | ${escapeMarkdownCell(row.requiredEvidence)} | ${escapeMarkdownCell(row.owner)} | ${escapeMarkdownCell(row.nextAction)} |`,
    );
  }

  lines.push(
    '',
    '## Go/No-Go rule',
    '',
    'Release remains blocked while any required P0 runtime evidence item is `Open`, `Exception`, invalid, stale, bound to another SHA, or missing from this register.',
    '',
    '`Complete` means the evidence file exists, is non-placeholder, is bound to the expected repository/branch/SHA where required, has valid provenance and redaction metadata, records a passing outcome, and passes its canonical specialist validator.',
    '',
    `Current final decision: **${derived.decision}**.`,
    '',
  );

  return lines.join('\n');
}

function writeFile(target, content) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let evaluation;
  try {
    evaluation = evaluateP0RuntimeEvidence();
  } catch (error) {
    console.error(
      `P0 derived register failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }

  const derived = deriveP0Register({ evaluation });
  const markdown = renderP0RegisterMarkdown(derived);

  if (hasFlag('--write-artifacts')) {
    writeFile(JSON_ARTIFACT, `${JSON.stringify(derived, null, 2)}\n`);
    writeFile(MARKDOWN_ARTIFACT, markdown);
  }

  if (hasFlag('--write-register')) {
    if (!derived.assessedCommitSha) {
      console.error('--write-register requires RELEASE_COMMIT_SHA or GITHUB_SHA');
      process.exit(1);
    }
    writeFile(DEFAULT_P0_REGISTER_PATH, markdown);
  }

  console.log(JSON.stringify(derived, null, 2));

  if (hasFlag('--check-overclaim') && derived.overclaims.length > 0) {
    console.error('Committed P0 register overclaims one or more canonical evidence results.');
    process.exit(1);
  }

  if (
    hasFlag('--require-synchronised')
    && (derived.overclaims.length > 0 || derived.underclaims.length > 0)
  ) {
    console.error('Committed P0 register is not synchronised with canonical evidence results.');
    process.exit(1);
  }
}
