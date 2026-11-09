import assert from 'node:assert/strict';
import test from 'node:test';
import { toSafeHistoryEvidence } from '../../scripts/security/write-gitleaks-history-metadata.mjs';

const sha = 'a'.repeat(40);

test('redacted metadata preserves location and rule without raw match or secret', () => {
  const rows = [{
    RuleID: 'synthetic-rule',
    File: 'tests/fixtures/synthetic.ts',
    StartLine: 19,
    Commit: 'b'.repeat(40),
    Secret: 'SYNTHETIC_CONTENT_MUST_NOT_LEAK',
    Match: 'SYNTHETIC_MATCH_MUST_NOT_LEAK',
    Fingerprint: 'SYNTHETIC_FINGERPRINT_MUST_NOT_LEAK',
  }];
  const summary = toSafeHistoryEvidence(rows, { sourceSha: sha, runId: '123' });
  assert.equal(summary.findingCount, 1);
  assert.equal(summary.disposition, 'OPEN_UNTRIAGED');
  assert.equal(summary.findings[0].filePath, 'tests/fixtures/synthetic.ts');
  assert.equal(summary.findings[0].ruleId, 'synthetic-rule');
  assert.equal(summary.findings[0].line, 19);
  for (const marker of ['SYNTHETIC_CONTENT_MUST_NOT_LEAK', 'SYNTHETIC_MATCH_MUST_NOT_LEAK', 'SYNTHETIC_FINGERPRINT_MUST_NOT_LEAK']) {
    assert.equal(JSON.stringify(summary).includes(marker), false);
  }
});

test('suspicious source path is hidden and invalid report fails closed', () => {
  const rows = [{ RuleID: 'fixture', File: 'folder/secret path', StartLine: -1 }];
  const summary = toSafeHistoryEvidence(rows, { sourceSha: sha, runId: '123' });
  assert.equal(summary.findings[0].filePath, '[REDACTED_PATH]');
  assert.equal(summary.findings[0].line, null);
  assert.throws(() => toSafeHistoryEvidence({}, { sourceSha: sha, runId: '123' }));
  assert.throws(() => toSafeHistoryEvidence(rows, { sourceSha: 'wrong', runId: '123' }));
  assert.throws(() => toSafeHistoryEvidence(rows, { sourceSha: sha, runId: 'wrong' }));
});

test('empty scan is not mistaken for a provider-backed formal gate acceptance', () => {
  const summary = toSafeHistoryEvidence([], { sourceSha: sha, runId: '123' });
  assert.equal(summary.findingCount, 0);
  assert.equal(summary.disposition, 'NO_FINDINGS');
  assert.equal(Object.hasOwn(summary, 'formalGateAcceptance'), false);
});
