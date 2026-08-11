import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/enterprise-100-closure.yml', 'utf8');
const checker = readFileSync('scripts/release/check-enterprise-100-closure.mjs', 'utf8');
const hydrator = readFileSync('scripts/release/hydrate-enterprise-100-evidence.mjs', 'utf8');
const collector = readFileSync('scripts/enterprise/collect-github-exact-sha-artifacts.mjs', 'utf8');

test('Enterprise 100 fan-in remains read-only and immutable-action pinned', () => {
  assert.match(workflow, /permissions:\n  contents: read\n  actions: read/);
  assert.match(workflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(workflow, /actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38/);
  assert.match(workflow, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});

test('fan-in delegates exact-SHA artifact collection to the fail-closed collector', () => {
  assert.match(workflow, /collect-github-exact-sha-artifacts\.mjs \\\n            enterprise-100/);
  assert.match(workflow, /github-exact-sha-artifact-collection\.json/);
  assert.match(workflow, /HYDRATED_CLOSURE_ROOT: artifacts\/enterprise-100-evidence-root/);
  assert.match(workflow, /hydrate-enterprise-100-evidence\.mjs/);
  assert.match(workflow, /ENTERPRISE_CLOSURE_EVIDENCE_ROOTS/);
  assert.doesNotMatch(workflow, /gh api --paginate "repos\/\$\{GITHUB_REPOSITORY\}\/actions\/artifacts\?per_page=100"/);
});

test('artifact collection is restricted to authorized families and exact producer workflows', () => {
  const expectedPairs = new Map([
    ['enterprise-production-final-evidence-*', '.github/workflows/enterprise-production-gate.yml'],
    ['enterprise-recovery-*', '.github/workflows/enterprise-recovery-drill.yml'],
    ['enterprise-runtime-closeout-*', '.github/workflows/enterprise-runtime-evidence-closeout.yml'],
    ['enterprise-readiness-scorecard-*', '.github/workflows/enterprise-readiness-scorecard.yml'],
    ['stripe-billing-validation', '.github/workflows/stripe-runtime-proof.yml'],
    ['supabase-production-migration-dry-run-*', '.github/workflows/supabase-production-migration-dry-run.yml'],
    ['final-legal-publication-gate-*', '.github/workflows/final-legal-publication-gate.yml'],
    ['enterprise-conversation-runtime-closeout-*', '.github/workflows/enterprise-conversation-runtime-closeout.yml'],
  ]);

  for (const [artifactPattern, workflowPath] of expectedPairs) {
    assert.ok(collector.includes(artifactPattern), `missing artifact allowlist pattern ${artifactPattern}`);
    assert.ok(collector.includes(workflowPath), `missing producer workflow binding ${workflowPath}`);
  }

  assert.match(collector, /actions\/workflows\/\$\{workflowId\}\/runs\?status=completed&head_sha=\$\{targetSha\}&per_page=\$\{RECENT_COMPLETED_RUN_WINDOW\}/);
  assert.match(collector, /run\?\.path !== spec\.workflowPath/);
  assert.match(collector, /RECENT_RUN_WINDOW_EXHAUSTED/);
  assert.match(collector, /RUN_ARTIFACT_INVENTORY_TRUNCATED/);
});

test('GitHub API failures cannot be converted into a synthetic zero-evidence closure', () => {
  assert.match(collector, /GITHUB_API_RATE_LIMITED/);
  assert.match(collector, /InfrastructureBlocked/);
  assert.match(collector, /refusing to reinterpret infrastructure failure as missing evidence/);
  assert.match(collector, /A zero artifact result for a producer is emitted only after its complete returned exact-SHA completed-run inventory was inspected/);
});

test('human legal and conversation closeout producers trigger exact-SHA reevaluation', () => {
  assert.match(workflow, /- 'Final Legal Publication Gate'/);
  assert.match(workflow, /- 'Enterprise Conversation Runtime Closeout'/);
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
