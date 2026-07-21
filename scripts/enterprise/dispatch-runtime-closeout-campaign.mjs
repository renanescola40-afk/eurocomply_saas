#!/usr/bin/env node

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const targetSha = String(process.env.TARGET_SHA || '').toLowerCase();
const applyMigrations = String(process.env.APPLY_MIGRATIONS || 'false') === 'true';

if (!repository || !token) throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required');
if (!/^[a-f0-9]{40}$/.test(targetSha)) throw new Error('TARGET_SHA must be a full 40-character Git SHA');

const workflows = [
  { file: 'auth-rbac-runtime-proof.yml', controls: ['IAM-01','IAM-02','IAM-03','IAM-04','IAM-05','IAM-06','TEN-01'], inputs: { release_sha: targetSha } },
  { file: 'supabase-live-rls-validation.yml', controls: ['TEN-02','TEN-03','TEN-04','TEN-05','TEN-06'], inputs: { release_sha: targetSha, apply_migrations: applyMigrations } },
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

const receipt = {
  schema: 'risck-comply.enterprise-runtime-closeout-campaign.v1',
  repository,
  branch: 'main',
  targetSha,
  applyMigrations,
  dispatchedAt: new Date().toISOString(),
  status: 'dispatched',
  workflows: [],
  controlCount: new Set(workflows.flatMap((item) => item.controls)).size,
  evidenceBoundary: 'A dispatch receipt proves orchestration only. Controls remain open until each protected workflow emits passing exact-SHA evidence and the canonical scorecard promotes it.',
};

for (const workflow of workflows) {
  await github(`/actions/workflows/${workflow.file}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main', inputs: workflow.inputs }),
  });
  receipt.workflows.push({ workflow: workflow.file, controls: workflow.controls, status: 'dispatch_accepted' });
}

process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
