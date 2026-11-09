#!/usr/bin/env node
// Report *locators* for authorized security triage without publishing secrets,
// matched source lines, commit messages, authors, emails or raw fingerprints.
// The Gitleaks scan must retain its original fail-closed exit status.
import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, openSync, readSync, writeFileSync } from 'node:fs';
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

// Open exactly once and read no more than MAX_RAW_BYTES from that descriptor.
// This avoids path-based check/use races (CodeQL js/file-system-race).
export function readBoundedGitleaksReport(rawPath) {
  const fd = openSync(rawPath, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!fstatSync(fd).isFile()) throw new Error('raw report is not a regular file');
    const parts = [];
    let count = 0;
    while (true) {
      // A single additional byte is enough to prove the cap was exceeded.
      const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, MAX_RAW_BYTES + 1 - count));
      const bytes = readSync(fd, buffer, 0, buffer.length, null);
      if (bytes === 0) break;
      count += bytes;
      if (count > MAX_RAW_BYTES) throw new Error('raw report exceeds safe parse size');
      parts.push(buffer.subarray(0, bytes));
    }
    return Buffer.concat(parts).toString('utf8');
  } finally {
    closeSync(fd);
  }
}

export function runCli() {
  const [rawPath, safePath] = process.argv.slice(2);
  const sourceSha = process.env.RISCK_ASSESSED_SOURCE_SHA;
  if (!rawPath || !safePath) throw new Error('missing report paths');
  const output = sanitizeFindings(JSON.parse(readBoundedGitleaksReport(rawPath)), sourceSha);
  writeFileSync(safePath, JSON.stringify(output, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log('Sanitized ' + output.findingCount + ' Gitleaks finding locators; raw values are not retained in the artifact.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { runCli(); }
  catch { console.error('Failed to create safe Gitleaks triage report; scanner remains failed.'); process.exitCode = 1; }
}
