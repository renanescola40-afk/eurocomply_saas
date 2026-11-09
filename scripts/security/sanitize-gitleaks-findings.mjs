#!/usr/bin/env node
// Report *locators* for authorized security triage without publishing secrets,
// matched source lines, commit messages, authors, emails or raw fingerprints.
// The Gitleaks scan must retain its original fail-closed exit status.
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const FULL_SHA = /^[a-f0-9]{40}$/;
const SAFE_RULE = /^[A-Za-z0-9_.-]{1,96}$/;
const SAFE_FILE = /^[A-Za-z0-9_.@+()\/-][A-Za-z0-9_.@+()\/ -]{0,319}$/;
const MAX_FINDINGS = 2000;
const MAX_RAW_BYTES = 5_000_000;

function safeFile(value) {
  if (typeof value !== 'string' || !SAFE_FILE.test(value)
    || value.startsWith('/') || value.includes('//')
    || value.split('/').some((part) => part === '.' || part === '..')) {
    return '[redacted-nonstandard-path]';
  }
  return value;
}

export function sanitizeFindings(raw, sourceSha) {
  if (typeof sourceSha !== 'string' || !FULL_SHA.test(sourceSha)) {
    throw new Error('invalid exact source sha');
  }
  if (!Array.isArray(raw) || raw.length > MAX_FINDINGS) {
    throw new Error('invalid gitleaks report shape');
  }
  const findings = raw.map((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)
      || typeof row.RuleID !== 'string' || typeof row.File !== 'string'
      || typeof row.Fingerprint !== 'string') {
      throw new Error('invalid gitleaks finding shape');
    }
    const ruleId = SAFE_RULE.test(row.RuleID) ? row.RuleID : '[redacted-nonstandard-rule]';
    const commit = typeof row.Commit === 'string' && FULL_SHA.test(row.Commit)
      ? row.Commit.slice(0, 12) : '[unavailable]';
    const line = Number.isSafeInteger(row.StartLine) && row.StartLine > 0
      && row.StartLine < 1_000_000_000 ? row.StartLine : null;
    const fingerprintHash = createHash('sha256').update(row.Fingerprint).digest('hex').slice(0, 24);
    return { ruleId, file: safeFile(row.File), line, commit, fingerprintHash };
  });
  findings.sort((a, b) => a.ruleId.localeCompare(b.ruleId)
    || a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0)
    || a.commit.localeCompare(b.commit));
  const rules = Object.fromEntries([...new Set(findings.map((f) => f.ruleId))].sort().map((rule) => [
    rule, findings.filter((f) => f.ruleId === rule).length,
  ]));
  return {
    schema: 'risck.gitleaks.redacted-triage.v1',
    sourceSha,
    proofClass: 'REDACTED_LOCATOR_ONLY_NOT_SECRET_VALIDATION',
    findingCount: findings.length,
    rules,
    findings,
  };
}

export function runCli() {
  const [rawPath, safePath] = process.argv.slice(2);
  const sourceSha = process.env.RISCK_ASSESSED_SOURCE_SHA;
  if (!rawPath || !safePath) throw new Error('missing report paths');
  if (statSync(rawPath).size > MAX_RAW_BYTES) throw new Error('raw report exceeds safe parse size');
  const output = sanitizeFindings(JSON.parse(readFileSync(rawPath, 'utf8')), sourceSha);
  writeFileSync(safePath, JSON.stringify(output, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log('Sanitized ' + output.findingCount + ' Gitleaks finding locators; raw values are not retained in the artifact.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { runCli(); }
  catch { console.error('Failed to create safe Gitleaks triage report; scanner remains failed.'); process.exitCode = 1; }
}
