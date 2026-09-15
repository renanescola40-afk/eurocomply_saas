#!/usr/bin/env node

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const targetSha = String(process.env.TARGET_SHA || '').toLowerCase();
const supabasePromotionRunId = String(process.env.SUPABASE_PROMOTION_RUN_ID || '').trim();
const supabaseReattestationRunId = String(process.env.SUPABASE_REATTESTATION_RUN_ID || '').trim();

if (!repository || !token) throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required');
if (!/^[a-f0-9]{40}$/.test(targetSha)) throw new Error('TARGET_SHA must be a full 40-character Git SHA');

const promotionSet = /^\d+$/.test(supabasePromotionRunId);
const reattestationSet = /^\d+$/.test(supabaseReattestationRunId);
if (promotionSet === reattestationSet) {
  throw new Error('Exactly one of SUPABASE_PROMOTION_RUN_ID or SUPABASE_REATTESTATION_RUN_ID must be a numeric canonical Supabase authority run ID');
}

const supabaseAuthorityMode = promotionSet ? 'promotion' : 'reattestation';
const supabaseAuthorityRunId = promotionSet ? supabasePromotionRunId : supabaseReattestationRunId;
const supabaseRlsInputs = {
  release_sha: targetSha,
  promotion_run_id: promotionSet ? supabasePromotionRunId : '',
  reattestation_run_id: reattestationSet ? supabaseReattestationRunId : '',
  confirmation: promotionSet
    ? 'EXECUTE_POST_FORWARD_PROMOTION_RUNTIME_PROOF'
    : 'EXECUTE_POST_REATTESTATION_RUNTIME_PROOF',
};

const workflows = [
  { file: 'auth-rbac-runtime-proof.yml', controls: ['IAM-01','IAM-02','IAM-03','IAM-04','IAM-05','IAM-06','TEN-01'], inputs: { release_sha: targetSha } },
  { file: 'supabase-live-rls-validation.yml', controls: ['TEN-02','TEN-03','TEN-04','TEN-05','TEN-06'], inputs: supabaseRlsInputs },
  { file: 'distributed-rate-limit-runtime-proof.yml', controls: ['PLT-09'], inputs: { release_sha: targetSha } },
  { file: 'production-runtime-proof.yml', controls: ['SEC-05','SEC-06','PLT-01','REL-02','REL-03','REL-04','REL-05','REL-06'], inputs: { release_sha: targetSha } },
  { file: 'p0-branch-protection-evidence.yml', controls: ['REL-08'], inputs: { release_sha: targetSha } },
];

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

const authorityRun = await github(`/actions/runs/${supabaseAuthorityRunId}`);
const expectedAuthorityPath = promotionSet
  ? '.github/workflows/supabase-forward-reconciliation-production-promotion.yml'
  : '.github/workflows/supabase-forward-production-reattestation.yml';
if (authorityRun.head_sha !== targetSha) throw new Error('Supabase authority run is not bound to TARGET_SHA');
if (authorityRun.path !== expectedAuthorityPath) throw new Error(`Supabase authority workflow path mismatch: ${authorityRun.path}`);
if (authorityRun.event !== 'workflow_dispatch' || authorityRun.status !== 'completed' || authorityRun.conclusion !== 'success') {
  throw new Error('Supabase authority run must be a successful completed workflow_dispatch');
}

const receipt = {
  schema: 'risck-comply.enterprise-runtime-closeout-campaign.v2',
  repository,
  branch: 'main',
  targetSha,
  supabaseAuthorityMode,
  supabaseAuthorityRunId,
  dispatchedAt: new Date().toISOString(),
  status: 'dispatched',
  workflows: [],
  controlCount: new Set(workflows.flatMap((item) => item.controls)).size,
  evidenceBoundary: 'A dispatch receipt proves orchestration only. TEN-RLS is bound to exactly one successful canonical exact-SHA Supabase authority: governed Production promotion or read-only Production reattestation. Controls remain open until protected workflows emit passing exact-SHA evidence.',
};

for (const workflow of workflows) {
  await github(`/actions/workflows/${workflow.file}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main', inputs: workflow.inputs }),
  });
  receipt.workflows.push({ workflow: workflow.file, controls: workflow.controls, status: 'dispatch_accepted' });
}

process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
