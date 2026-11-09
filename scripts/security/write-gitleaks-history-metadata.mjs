#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const shaPattern = /^[a-f0-9]{40}$/i;
const rulePattern = /^[A-Za-z0-9_.-]{1,120}$/;
const safePathPattern = /^[A-Za-z0-9_./-]{1,240}$/;

export function toSafeHistoryEvidence(findings, { sourceSha, runId } = {}) {
  if (!Array.isArray(findings)) throw new TypeError('Expected Gitleaks findings array');
  if (!shaPattern.test(String(sourceSha || ''))) throw new TypeError('Expected exact GitHub source SHA');
  if (!/^\d+$/.test(String(runId || ''))) throw new TypeError('Expected numeric GitHub run ID');
  const rows = findings.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new TypeError('Malformed Gitleaks finding');
    const file = String(item.File || '');
    const path = safePathPattern.test(file) && !file.split('/').includes('..')
      && !/(?:sk_live_|rk_live_|whsec_|gh[pousr]_|sbp_)/i.test(file)
      ? file : '[REDACTED_PATH]';
    const rule = String(item.RuleID || '');
    const commit = String(item.Commit || '');
    const line = Number(item.StartLine);
    return {
      ruleId: rulePattern.test(rule) ? rule : 'UNCLASSIFIED',
      filePath: path,
      filePathSha256: createHash('sha256').update(file).digest('hex'),
      commitSha: shaPattern.test(commit) ? commit.toLowerCase() : null,
      line: Number.isSafeInteger(line) && line > 0 ? line : null,
    };
  });
  rows.sort((left, right) =>
    String(left.commitSha).localeCompare(String(right.commitSha))
    || left.filePathSha256.localeCompare(right.filePathSha256)
    || (left.line ?? 0) - (right.line ?? 0));
  return {
    schema: 'risck-comply.gitleaks-history-metadata.v1',
    sourceSha: String(sourceSha).toLowerCase(),
    githubRunId: String(runId),
    scanScope: 'repository-git-history',
    findingCount: rows.length,
    disposition: rows.length ? 'OPEN_UNTRIAGED' : 'NO_FINDINGS',
    rawSecretValuesStored: false,
    findings: rows,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output || !existsSync(input)) {
    console.error('Gitleaks report input/output missing');
    process.exit(2);
  }
  try {
    const rows = JSON.parse(readFileSync(input, 'utf8'));
    const evidence = toSafeHistoryEvidence(rows, {
      sourceSha: process.env.GITHUB_SHA,
      runId: process.env.GITHUB_RUN_ID,
    });
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n');
    console.log('Redacted Gitleaks history metadata written; count: ' + evidence.findingCount);
  } catch (error) {
    console.error('Cannot safely generate Gitleaks history metadata: ' + error.message);
    process.exit(2);
  }
}
