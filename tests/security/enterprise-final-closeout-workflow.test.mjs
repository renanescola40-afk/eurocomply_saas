import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/enterprise-final-closeout-dashboard.yml', 'utf8');
const generator = readFileSync('scripts/enterprise/generate-final-closeout-dashboard.mjs', 'utf8');
const hydrator = readFileSync('scripts/enterprise/hydrate-exact-sha-evidence.mjs', 'utf8');
const collector = readFileSync('scripts/enterprise/collect-github-exact-sha-artifacts.mjs', 'utf8');

test('workflow uses read-only permissions and immutable action pins', () => {
  assert.match(workflow, /permissions:\n  contents: read\n  actions: read/);
  assert.match(workflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(workflow, /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020/);
  assert.match(workflow, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});

test('strict mode remains fail-closed and exact-SHA bound', () => {
  assert.match(workflow, /generate-final-closeout-dashboard\.mjs --strict/);
  assert.match(generator, /ENTERPRISE_TARGET_SHA must be a full lowercase 40-character Git SHA/);
  assert.match(generator, /sha_mismatch/);
  assert.match(generator, /sensitive_values/);
  assert.match(generator, /report\.scores\.completed !== 100/);
});

test('dashboard keeps implementation runtime and human review separate', () => {
  assert.match(generator, /implementation:/);
  assert.match(generator, /runtime:/);
  assert.match(generator, /humanReview:/);
  assert.match(generator, /completed:/);
  assert.match(generator, /remaining:/);
  assert.match(generator, /does not create, fabricate or independently approve/);
});

test('retained evidence uses workflow-scoped exact-SHA collection and isolated hydration', () => {
  assert.match(workflow, /collect-github-exact-sha-artifacts\.mjs \\\n            dashboard/);
  assert.match(workflow, /github-exact-sha-artifact-collection\.json/);
  assert.match(workflow, /HYDRATED_EVIDENCE_ROOT: artifacts\/exact-sha-evidence-root/);
  assert.match(workflow, /hydrate-exact-sha-evidence\.mjs/);
  assert.doesNotMatch(workflow, /gh api --paginate "repos\/\$\{GITHUB_REPOSITORY\}\/actions\/artifacts\?per_page=100"/);
  assert.match(hydrator, /REJECTED_SENSITIVE/);
  assert.match(hydrator, /AMBIGUOUS/);
  assert.match(hydrator, /candidate\.sha === targetSha/);
  assert.match(hydrator, /never converted into PASS/);
});

test('dashboard collector binds all accepted artifact families to exact producer workflow paths', () => {
  const expectedPairs = new Map([
    ['eu-ai-act-final-runtime-closeout-*', '.github/workflows/eu-ai-act-final-runtime-closeout.yml'],
    ['branch-protection-runtime-proof-*', '.github/workflows/branch-protection-runtime-proof.yml'],
    ['production-provider-runtime-proof-*', '.github/workflows/production-provider-runtime-proof.yml'],
    ['enterprise-readiness-scorecard-*', '.github/workflows/enterprise-readiness-scorecard.yml'],
    ['enterprise-runtime-closeout-*', '.github/workflows/enterprise-runtime-evidence-closeout.yml'],
  ]);

  for (const [artifactPattern, workflowPath] of expectedPairs) {
    assert.ok(collector.includes(artifactPattern), `missing dashboard artifact pattern ${artifactPattern}`);
    assert.ok(collector.includes(workflowPath), `missing dashboard producer binding ${workflowPath}`);
  }

  assert.doesNotMatch(
    collector,
    /workflow: 'enterprise-readiness-scorecard\.yml'[\s\S]*?artifactPatterns: Object\.freeze\(\['\*'\]\)/,
  );
  assert.match(collector, /actions\/workflows\/\$\{workflowId\}\/runs\?status=completed&head_sha=\$\{targetSha\}&per_page=\$\{RECENT_COMPLETED_RUN_WINDOW\}/);
  assert.match(collector, /run\?\.path !== spec\.workflowPath/);
  assert.match(collector, /RECENT_RUN_WINDOW_EXHAUSTED/);
});

test('GitHub API infrastructure failures cannot produce a green synthetic zero-runtime dashboard', () => {
  assert.match(collector, /GITHUB_API_RATE_LIMITED/);
  assert.match(collector, /InfrastructureBlocked/);
  assert.match(collector, /Infrastructure failure is not evidence absence/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /Infrastructure error:/);
});

test('same-SHA producer completions coalesce to the newest closeout dashboard snapshot', () => {
  assert.match(workflow, /group: enterprise-final-closeout-dashboard-/);
  assert.match(workflow, /cancel-in-progress: true/);
});

test('dashboard summaries use valid jq string programs', () => {
  assert.match(workflow, /jq -r '"- Status:/);
  assert.match(workflow, /jq -r '"- Hydrated:/);
  assert.match(workflow, /errorCode \/\/ "none"/);
  assert.doesNotMatch(workflow, /\\"none\\"/);
});
