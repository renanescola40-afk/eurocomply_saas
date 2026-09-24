#!/usr/bin/env node

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const targetSha = String(process.env.TARGET_SHA || '').toLowerCase();
const supabasePromotionRunId = String(process.env.SUPABASE_PROMOTION_RUN_ID || '').trim();
const supabaseReattestationRunId = String(process.env.SUPABASE_REATTESTATION_RUN_ID || '').trim();
const supabaseCurrentStateRunId = String(process.env.SUPABASE_CURRENT_STATE_RUN_ID || '').trim();
const campaignTriggerEvent = String(process.env.CAMPAIGN_TRIGGER_EVENT || 'workflow_dispatch').trim();

if (!repository || !token) throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required');
if (!/^[a-f0-9]{40}$/.test(targetSha)) throw new Error('TARGET_SHA must be a full 40-character Git SHA');

const promotionSet = /^\d+$/.test(supabasePromotionRunId);
const reattestationSet = /^\d+$/.test(supabaseReattestationRunId);
const currentStateSet = /^\d+$/.test(supabaseCurrentStateRunId);
if ([promotionSet, reattestationSet, currentStateSet].filter(Boolean).length > 1) {
  throw new Error('At most one canonical Supabase authority run ID may be supplied');
}

const hasSupabaseAuthority = promotionSet || reattestationSet || currentStateSet;
const supabaseAuthorityMode = promotionSet ? 'promotion' : reattestationSet ? 'reattestation' : currentStateSet ? 'current_state' : null;
const supabaseAuthorityRunId = promotionSet ? supabasePromotionRunId : reattestationSet ? supabaseReattestationRunId : currentStateSet ? supabaseCurrentStateRunId : null;
const supabaseRlsInputs = hasSupabaseAuthority ? {
  release_sha: targetSha,
  promotion_run_id: promotionSet ? supabasePromotionRunId : '',
  reattestation_run_id: reattestationSet ? supabaseReattestationRunId : '',
  current_state_run_id: currentStateSet ? supabaseCurrentStateRunId : '',
  confirmation: promotionSet
    ? 'EXECUTE_POST_FORWARD_PROMOTION_RUNTIME_PROOF'
    : reattestationSet
      ? 'EXECUTE_POST_REATTESTATION_RUNTIME_PROOF'
      : 'EXECUTE_CURRENT_PRODUCTION_STATE_RUNTIME_PROOF',
} : null;

let workflows = [
  { file: 'auth-rbac-runtime-proof.yml', controls: ['IAM-01','IAM-02','IAM-03','IAM-04','IAM-05','IAM-06','TEN-01'], inputs: { release_sha: targetSha } },
  { file: 'distributed-rate-limit-runtime-proof.yml', controls: ['PLT-09'], inputs: { release_sha: targetSha } },
  { file: 'production-runtime-proof.yml', controls: ['SEC-05','SEC-06','PLT-01','REL-02','REL-03','REL-04','REL-05','REL-06'], inputs: { release_sha: targetSha } },
  { file: 'audit-chain-runtime-proof.yml', controls: ['AUD-CHAIN'], inputs: { release_sha: targetSha } },
  { file: 'step-up-runtime-proof.yml', controls: ['IAM-08'], inputs: { release_sha: targetSha } },
  { file: 'supabase-production-rls-reconciliation.yml', controls: ['TEN-RLS-RECONCILIATION'], inputs: { release_sha: targetSha, package: 'rls_catalog', mode: 'verify_only', confirmation: '' } },
  { file: 'p0-branch-protection-evidence.yml', controls: ['REL-08'], inputs: { release_sha: targetSha } },
];

if (campaignTriggerEvent === 'push') {
  const directPushProofs = new Set([
    'auth-rbac-runtime-proof.yml',
    'distributed-rate-limit-runtime-proof.yml',
    'production-runtime-proof.yml',
    'audit-chain-runtime-proof.yml',
  ]);
  workflows = workflows.filter((workflow) => !directPushProofs.has(workflow.file));
}

if (hasSupabaseAuthority) {
  workflows.splice(1, 0, {
    file: 'supabase-live-rls-validation.yml',
    controls: ['TEN-02','TEN-03','TEN-04','TEN-05','TEN-06'],
    inputs: supabaseRlsInputs,
  });
}

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed with ${response.status}`);
  return response.status === 204 ? null : response.json();
}

const main = await github('/commits/main');
if (main.sha !== targetSha) throw new Error(`TARGET_SHA ${targetSha} is not current main ${main.sha}`);

if (hasSupabaseAuthority) {
  const authorityRun = await github(`/actions/runs/${supabaseAuthorityRunId}`);
  const expectedAuthorityPath = promotionSet
    ? '.github/workflows/supabase-forward-reconciliation-production-promotion.yml'
    : reattestationSet
      ? '.github/workflows/supabase-forward-production-reattestation.yml'
      : '.github/workflows/supabase-current-production-state-read-only.yml';
  if (authorityRun.head_sha !== targetSha) throw new Error('Supabase authority run is not bound to TARGET_SHA');
  if (authorityRun.path !== expectedAuthorityPath) throw new Error(`Supabase authority workflow path mismatch: ${authorityRun.path}`);
  if (authorityRun.event !== 'workflow_dispatch' || authorityRun.status !== 'completed' || authorityRun.conclusion !== 'success') {
    throw new Error('Supabase authority run must be a successful completed workflow_dispatch');
  }
}

const receipt = {
  schema: 'risck-comply.enterprise-runtime-closeout-campaign.v3',
  repository,
  branch: 'main',
  targetSha,
  supabaseAuthorityMode,
  supabaseAuthorityRunId,
  dispatchedAt: new Date().toISOString(),
  triggerEvent: campaignTriggerEvent,
  status: hasSupabaseAuthority ? 'dispatched' : 'dispatched_non_supabase_only',
  workflows: [],
  controlCount: new Set(workflows.flatMap((item) => item.controls)).size,
  evidenceBoundary: hasSupabaseAuthority
    ? 'A dispatch receipt proves orchestration only. TEN-RLS is bound to exactly one successful canonical exact-SHA Supabase authority. Controls remain open until protected workflows emit passing exact-SHA evidence.'
    : campaignTriggerEvent === 'push'
      ? 'A dispatch receipt proves orchestration only. Proof workflows with their own main push trigger are not redispatched. Only workflow_dispatch-only non-Supabase proofs and read-only RLS reconciliation are dispatched. TEN-RLS live proof remains intentionally undispatched and OPEN until a canonical exact-SHA promotion, reattestation, or current-state read-only authority exists.'
      : 'A dispatch receipt proves orchestration only. Non-Supabase proofs and read-only RLS reconciliation may run without a Supabase authority. TEN-RLS live proof remains intentionally undispatched and OPEN until a canonical exact-SHA promotion, reattestation, or current-state read-only authority exists.',
};

for (const workflow of workflows) {
  await github(`/actions/workflows/${workflow.file}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main', inputs: workflow.inputs }),
  });
  receipt.workflows.push({ workflow: workflow.file, controls: workflow.controls, status: 'dispatch_accepted' });
}

process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
