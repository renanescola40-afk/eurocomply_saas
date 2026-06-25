#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const approval = readFileSync('docs/RELEASE_APPROVAL_RECORD.md', 'utf8');
const plan = readFileSync('docs/security/ENTERPRISE_RELEASE_EXECUTION_PLAN_2026_06_24.md', 'utf8');
const runbook = readFileSync('docs/ops/VERCEL_DEPLOYMENT_RECOVERY_RUNBOOK.md', 'utf8');
const runner = readFileSync('scripts/release/run-final-validation.mjs', 'utf8');

function must(text, value, label) {
  if (!text.includes(value)) throw new Error(`${label} must contain: ${value}`);
}

for (const value of ['Release owner', 'Incident owner', 'Rollback owner', 'Customer communication owner', 'Support owner', 'Security owner', '- [x] **No-Go**']) must(approval, value, 'approval record');
for (const value of ['Deployment URL:', '## Rollback target', 'Previous known-good deployment URL candidate', 'Rollback trigger criteria']) must(approval, value, 'approval record');
if (!approval.includes('runtime URL was not functionally verified') && !approval.includes('functional verification and dry-run evidence not attached')) throw new Error('approval record must document candidate rollback URL as unverified');
for (const value of ['## Exact pull request order', '| 1 | 1 | Deployment, final validation, owners, rollback control plane |', '| 7 | 7 | External review package, final readiness, Go/No-Go |']) must(plan, value, 'enterprise execution plan');
for (const value of ['/api/health', '/api/ready', 'exact commit under assessment']) must(runbook, value, 'Vercel recovery runbook');
for (const value of ['npm ci', 'npm run lint', 'npm run typecheck', 'npm run test', 'npm run build']) must(runner, value, 'final validation runner');

console.log('Day 1 release control-plane gate passed. Current deployment evidence is either present or explicitly blocks Go.');
