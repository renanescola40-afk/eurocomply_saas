import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/enterprise-100-closure.yml', 'utf8');
const rlsWorkflow = readFileSync('.github/workflows/supabase-production-rls-reconciliation.yml', 'utf8');
const rlsEvidenceWriter = readFileSync('scripts/supabase/write-rls-reconciliation-closure-evidence.mjs', 'utf8');
const checker = readFileSync('scripts/release/check-enterprise-100-closure.mjs', 'utf8');
const hydrator = readFileSync('scripts/release/hydrate-enterprise-100-evidence.mjs', 'utf8');
const shaBindingResolver = readFileSync('scripts/release/evidence-sha-binding.mjs', 'utf8');
const deploymentProof = readFileSync('scripts/release/write-github-vercel-production-deployment-evidence.mjs', 'utf8');
const collector = readFileSync('scripts/enterprise/collect-github-exact-sha-artifacts.mjs', 'utf8');
const stripePromotionFetcher = readFileSync('scripts/enterprise/fetch-stripe-promoted-runtime-evidence.mjs', 'utf8');

test('Enterprise 100 fan-in remains read-only and immutable-action pinned', () => {
  assert.match(workflow, /permissions:\n  contents: read\n  actions: read\n  statuses: read\n  deployments: read/);
  assert.doesNotMatch(workflow, /(?:contents|actions|statuses|deployments|pull-requests|issues): write/);
  assert.match(workflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(workflow, /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020/);
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

test('closure generates exact-SHA Vercel deployment evidence directly before hydration', () => {
  assert.match(workflow, /Generate direct exact-SHA production deployment evidence/);
  assert.match(workflow, /write-github-vercel-production-deployment-evidence\.mjs/);
  assert.match(workflow, /direct-production-deployment\/release-validation\/production-deployment\.json/);
  assert.match(workflow, /PRODUCTION_DEPLOYMENT_PROOF_ATTEMPTS: '12'/);
  assert.match(workflow, /PRODUCTION_DEPLOYMENT_PROOF_POLL_MS: '5000'/);
  assert.match(workflow, /test -f "\$proof"/);
  assert.match(deploymentProof, /findExactShaVercelProductionDeployment/);
  assert.match(deploymentProof, /findExactShaVercelCommitStatus/);
  assert.match(deploymentProof, /EXPECTED_VERCEL_STATUS_CONTEXT = 'Vercel'/);
  assert.match(deploymentProof, /target_sha_is_not_current_main/);
  assert.match(deploymentProof, /githubCommitStatusBound/);
  assert.match(deploymentProof, /containsSensitiveValues: false/);
});

test('artifact collection is restricted to authorized families and exact producer workflows', () => {
  const expectedPairs = new Map([
    ['enterprise-production-final-evidence-*', '.github/workflows/enterprise-production-gate.yml'],
    ['production-runtime-proof-*', '.github/workflows/production-runtime-proof.yml'],
    ['enterprise-recovery-*', '.github/workflows/enterprise-recovery-drill.yml'],
    ['recovery-resilience-proof-*', '.github/workflows/recovery-resilience-proof.yml'],
    ['enterprise-runtime-closeout-*', '.github/workflows/enterprise-runtime-evidence-closeout.yml'],
    ['enterprise-readiness-scorecard-*', '.github/workflows/enterprise-readiness-scorecard.yml'],
    ['stripe-billing-validation', '.github/workflows/stripe-runtime-proof.yml'],
    ['supabase-production-migration-dry-run-*', '.github/workflows/supabase-production-migration-dry-run.yml'],
    ['supabase-rls-reconciliation-*', '.github/workflows/supabase-production-rls-reconciliation.yml'],
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

test('promoted Stripe runtime proof is the only Stripe document eligible for billing hydration', () => {
  assert.match(workflow, /- 'Stripe Runtime Evidence Promotion'/);
  assert.doesNotMatch(workflow, /- 'Stripe Runtime Proof'/);
  assert.match(workflow, /fetch-stripe-promoted-runtime-evidence\.mjs/);
  assert.match(workflow, /STRIPE_RUNTIME_EVIDENCE_REQUIRED: 'false'/);
  assert.match(workflow, /find "\$RETAINED_ARTIFACT_ROOT" -type f -name 'stripe-billing-validation\.json'/);
  assert.match(workflow, /\$\{legacy\}\.legacy-open-ignored/);
  assert.match(workflow, /authoritative-stripe-promotion/);
  assert.match(stripePromotionFetcher, /WORKFLOW_FILE = 'stripe-runtime-evidence-promotion\.yml'/);
  assert.match(stripePromotionFetcher, /evidence\?\.id !== 'stripe-entitlement-runtime-proof'/);
  assert.match(stripePromotionFetcher, /evidence\?\.status !== 'Complete' \|\| evidence\?\.outcome !== 'passed'/);
  assert.match(stripePromotionFetcher, /expectedCommitSha: targetSha/);
  assert.match(stripePromotionFetcher, /stripe-runtime-evidence-promoted-\$\{targetSha\}/);
});

test('Supabase RLS reconciliation promotion remains manual, exact-SHA and production protected', () => {
  assert.match(workflow, /- 'Supabase Production RLS Reconciliation'/);
  assert.match(rlsWorkflow, /workflow_dispatch:/);
  assert.match(rlsWorkflow, /environment: production/);
  assert.match(rlsWorkflow, /APPLY_RLS_RECONCILIATION/);
  assert.match(rlsWorkflow, /test "\$CONFIRMATION" = "APPLY_RLS_RECONCILIATION"/);
  assert.match(rlsWorkflow, /git rev-parse origin\/main/);
  assert.match(rlsWorkflow, /20260726070000_permissions_catalog_rls_hotfix\.sql/);
  assert.doesNotMatch(rlsWorkflow, /\n  push:/);
  assert.doesNotMatch(rlsWorkflow, /\n  workflow_run:/);
  assert.doesNotMatch(rlsWorkflow, /continue-on-error/);
});

test('Supabase RLS canonical closure evidence is emitted only after deterministic PASS verification', () => {
  assert.match(rlsWorkflow, /verify-rls-reconciliation-proof\.mjs/);
  assert.match(rlsWorkflow, /write-rls-reconciliation-closure-evidence\.mjs/);
  assert.match(rlsWorkflow, /release-validation\/supabase-rls-reconciliation\.json/);
  assert.match(rlsWorkflow, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
  assert.match(rlsEvidenceWriter, /verification\.status !== 'PASS'/);
  assert.match(rlsEvidenceWriter, /expectedSha: targetSha/);
  assert.match(rlsEvidenceWriter, /status: 'PASS'/);
  assert.match(rlsEvidenceWriter, /containsSensitiveValues: false/);
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

test('production and Supabase RLS producer completions retrigger exact-SHA closure', () => {
  assert.match(workflow, /- 'Enterprise Production Gate'/);
  assert.match(workflow, /- 'Production Runtime Proof'/);
  assert.match(workflow, /- 'Recovery Resilience Proof'/);
  assert.match(workflow, /- 'Enterprise Safe Runtime Bootstrap'/);
  assert.match(workflow, /- 'Enterprise Readiness Scorecard'/);
  assert.match(workflow, /- 'Supabase Production RLS Reconciliation'/);
  assert.match(workflow, /push:\n    branches: \[main\]/);
});

test('same-SHA producer completions collapse to the newest exact-SHA closure snapshot', () => {
  assert.match(workflow, /group: enterprise-100-closure-/);
  assert.match(workflow, /cancel-in-progress: true/);
  assert.doesNotMatch(workflow, /cancel-in-progress: false/);
});

test('closure execution requires the exact current main SHA rather than merely an ancestor of main', () => {
  assert.match(workflow, /Validate target SHA is exact current main/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$ENTERPRISE_CLOSURE_EXPECTED_SHA"/);
  assert.match(workflow, /test "\$main_sha" = "\$ENTERPRISE_CLOSURE_EXPECTED_SHA"/);
  assert.doesNotMatch(workflow, /compare\/\$\{ENTERPRISE_CLOSURE_EXPECTED_SHA\}\.\.\.\$\{main_sha\}/);
  assert.doesNotMatch(workflow, /identical\|ahead/);
});

test('closure summaries use valid jq string programs', () => {
  assert.match(workflow, /jq -r '"- Status:/);
  assert.match(workflow, /jq -r '"- Decision:/);
  assert.match(workflow, /jq -r '"- Hydrated retained evidence:/);
  assert.match(workflow, /errorCode \/\/ "none"/);
  assert.doesNotMatch(workflow, /\\"none\\"/);
});

test('closure remains fail closed after artifact hydration', () => {
  assert.match(checker, /ambiguous_exact_sha_evidence/);
  assert.match(checker, /sensitive_evidence_rejected/);
  assert.match(checker, /exact_sha_not_proven/);
  assert.match(checker, /conflicting_sha_bindings/);
  assert.match(checker, /accepted: statusAccepted/);
  assert.match(checker, /resolveEvidenceShaBinding/);
  assert.match(checker, /document\?\.finalDecision/);
  assert.match(checker, /document\?\.publicationStatus/);
  assert.match(hydrator, /REJECTED_SENSITIVE/);
  assert.match(hydrator, /SHA_CONFLICT/);
  assert.match(hydrator, /AMBIGUOUS/);
  assert.match(hydrator, /resolveEvidenceShaBinding/);
  assert.match(hydrator, /EXPLICIT_SOURCE_ALIASES/);
  assert.match(hydrator, /matchedBy: 'explicit_alias'/);
  assert.match(hydrator, /authoritative_declared_path/);
  assert.match(hydrator, /direct-production-deployment\/release-validation\/production-deployment\.json/);
  assert.match(hydrator, /does not award PASS/);
  assert.match(shaBindingResolver, /expectedSha/);
  assert.match(shaBindingResolver, /runtimeContext\.commitSha/);
  assert.match(shaBindingResolver, /distinctValidShas\.length > 1/);
});
