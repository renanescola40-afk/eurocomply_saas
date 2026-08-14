import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../../scripts/enterprise/run-repository-control-evidence-for-scorecard.mjs', import.meta.url),
  'utf8',
);

test('repository control scorecard wrapper reuses the canonical repository evidence boundary', () => {
  assert.match(source, /buildRepositoryDerivedCompatibilityView/);
  assert.match(source, /builderExitCode === 1 && validation\.passed && validation\.openCount > 0/);
  assert.match(source, /if \(compatibility\.enabled\)/);
  assert.match(source, /GITHUB_CHECKS_EVIDENCE_PATH: checksPath/);
  assert.match(source, /github-checks-repository-compatibility\.json/);
});

test('repository control compatibility remains explicitly non-production', () => {
  assert.match(source, /never changes the real requiredChecks or Enterprise Production Gate signals/);
  assert.match(source, /never grants production\/runtime release credit/);
  assert.doesNotMatch(source, /enterpriseProductionGate[^\n]*status:\s*['"]PASS['"]/);
});

test('repository control aggregation remains fail closed for malformed evidence', () => {
  assert.match(source, /sensitive_evidence_rejected/);
  assert.match(source, /exact_sha_boundary_invalid/);
  assert.match(source, /repository_control_aggregation_invalid/);
  assert.match(source, /Open evidence is retained but never promoted to PASS/);
});
