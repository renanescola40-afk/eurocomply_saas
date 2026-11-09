import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeFindings } from '../../scripts/security/sanitize-gitleaks-findings.mjs';

const SOURCE = 'a'.repeat(40);
const FIXTURE = Object.freeze({
  RuleID: 'generic-api-key',
  File: 'scripts/example.env',
  StartLine: 24,
  Commit: 'b'.repeat(40),
  Fingerprint: 'b'.repeat(40) + ':scripts/example.env:generic-api-key:24',
  Secret: 'fixture-only-not-a-real-key',
  Match: 'fixture=fixture-only-not-a-real-key',
  Line: 'fixture=fixture-only-not-a-real-key',
  Message: 'contains fixture-only-not-a-real-key',
  Email: 'fixture-private-address@example.invalid',
  Author: 'private-name',
});

test('strictly allowlists only non-secret locator fields', () => {
  const output = sanitizeFindings([FIXTURE], SOURCE);
  assert.equal(output.schema, 'risck.gitleaks.redacted-triage.v1');
  assert.equal(output.sourceSha, SOURCE);
  assert.equal(output.findingCount, 1);
  assert.deepEqual(output.findings[0].ruleId, 'generic-api-key');
  assert.deepEqual(output.findings[0].file, 'scripts/example.env');
  assert.deepEqual(output.findings[0].line, 24);
  assert.deepEqual(output.findings[0].commit, 'b'.repeat(12));
  assert.match(output.findings[0].fingerprintHash, /^[a-f0-9]{24}$/);
  for (const forbidden of ['fixture-only-not-a-real-key', 'fixture-private-address', 'private-name', 'fixture=', 'Fingerprint', 'Match', 'Secret', 'Message', 'Author', 'Email']) {
    assert.ok(!JSON.stringify(output).includes(forbidden), 'leaked forbidden field/value ' + forbidden);
  }
});

test('aggregates rules deterministically', () => {
  const output = sanitizeFindings([FIXTURE, {...FIXTURE, RuleID:'stripe-test-key', StartLine:25}], SOURCE);
  assert.deepEqual(output.rules, {'generic-api-key':1, 'stripe-test-key':1});
  assert.equal(output.findingCount, 2);
});

test('rejects invalid report shapes without printing the input', () => {
  for (const report of [null, 'oops', {}, [null], [7], [{Secret:'fixture-only-not-a-real-key'}]]) {
    assert.throws(() => sanitizeFindings(report, SOURCE), /invalid gitleaks report|invalid gitleaks finding/);
  }
});

test('requires a real exact-SHA source binding', () => {
  assert.throws(() => sanitizeFindings([FIXTURE], 'a'.repeat(7)), /invalid exact source sha/);
});

test('denies giant reports rather than creating unbounded artifacts', () => {
  assert.throws(() => sanitizeFindings(new Array(2001).fill(FIXTURE), SOURCE), /invalid gitleaks report/);
});

test('redacts malicious or unusual paths and filenames', () => {
  for (const file of ['../../secret', '/etc/passwd', 'bad\npath', 'a'.repeat(350)]) {
    const output = sanitizeFindings([{...FIXTURE, File:file}], SOURCE);
    assert.equal(output.findings[0].file, '[redacted-nonstandard-path]');
    assert.ok(!JSON.stringify(output).includes(file));
  }
});

test('redacts suspicious rule identifiers rather than copying text', () => {
  const output = sanitizeFindings([{...FIXTURE, RuleID:'fixture-only-not-a-real-key/invalid'}], SOURCE);
  assert.equal(output.findings[0].ruleId, '[redacted-nonstandard-rule]');
});

test('redacts invalid commits and line numbers', () => {
  const output = sanitizeFindings([{...FIXTURE, Commit:'bad', StartLine:-1}], SOURCE);
  assert.equal(output.findings[0].commit, '[unavailable]');
  assert.equal(output.findings[0].line, null);
});

test('never emits raw fingerprints even when they contain extra sensitive content', () => {
  const output = sanitizeFindings([{...FIXTURE, Fingerprint:'fixture-only-not-a-real-key'}], SOURCE);
  assert.ok(!JSON.stringify(output).includes('fixture-only-not-a-real-key'));
  assert.match(output.findings[0].fingerprintHash, /^[a-f0-9]{24}$/);
});

test('empty reports stay transparent without being mislabeled clean history proof', () => {
  const output = sanitizeFindings([], SOURCE);
  assert.equal(output.findingCount, 0);
  assert.deepEqual(output.findings, []);
  assert.equal(output.proofClass, 'REDACTED_LOCATOR_ONLY_NOT_SECRET_VALIDATION');
});
