import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/enterprise-100-closure.yml', 'utf8');
const checker = readFileSync('scripts/release/check-enterprise-100-closure.mjs', 'utf8');
const hydrator = readFileSync('scripts/release/hydrate-enterprise-100-evidence.mjs', 'utf8');

test('Enterprise 100 fan-in remains read-only and immutable-action pinned', () => {
  assert.match(workflow, /permissions:\n  contents: read\n  actions: read/);
  assert.match(workflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(workflow, /actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38/);
  assert.match(workflow, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});

test('fan-in accepts only retained artifacts bound to the exact closure SHA', () => {
  assert.match(workflow, /\.workflow_run\.head_sha/);
  assert.match(workflow, /test "\$artifact_sha" = "\$ENTERPRISE_CLOSURE_EXPECTED_SHA"/);
  assert.match(workflow, /HYDRATED_CLOSURE_ROOT: artifacts\/enterprise-100-evidence-root/);
  assert.match(workflow, /hydrate-enterprise-100-evidence\.mjs/);
  assert.match(workflow, /ENTERPRISE_CLOSURE_EVIDENCE_ROOTS/);
});

test('artifact downloads are restricted to authorized evidence producers', () => {
  for (const artifactPattern of [
    'enterprise-production-final-evidence-',
    'enterprise-recovery-',
    'enterprise-runtime-closeout-',
    'enterprise-readiness-scorecard-',
    'stripe-billing-validation',
    'supabase-production-migration-dry-run-',
    'final-legal-publication-gate-',
    'enterprise-conversation-runtime-closeout-',
  ]) {
    assert.ok(workflow.includes(artifactPattern), `missing artifact allowlist pattern ${artifactPattern}`);
  }
  assert.match(workflow, /\*\) continue ;;/);
  assert.doesNotMatch(workflow, /enterprise-final-closeout-dashboard-\*\|enterprise-100-closure-\*\) continue/);
});

test('human legal evidence producer triggers exact-SHA reevaluation', () => {
  assert.match(workflow, /- 'Final Legal Publication Gate'/);
});

test('producer completions queue instead of cancelling same-SHA closure runs', () => {
  assert.match(workflow, /group: enterprise-100-closure-/);
  assert.match(workflow, /cancel-in-progress: false/);
});

test('closure remains fail closed after artifact hydration', () => {
  assert.match(checker, /ambiguous_exact_sha_evidence/);
  assert.match(checker, /sensitive_evidence_rejected/);
  assert.match(checker, /exact_sha_not_proven/);
  assert.match(checker, /accepted: statusAccepted/);
  assert.match(checker, /document\?\.expectedSha/);
  assert.match(checker, /document\?\.finalDecision/);
  assert.match(checker, /document\?\.publicationStatus/);
  assert.match(hydrator, /REJECTED_SENSITIVE/);
  assert.match(hydrator, /AMBIGUOUS/);
  assert.match(hydrator, /EXPLICIT_SOURCE_ALIASES/);
  assert.match(hydrator, /matchedBy: 'explicit_alias'/);
  assert.match(hydrator, /does not award PASS/);
});
