import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readRepoFile(path: string) {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

describe('day 1 release control plane', () => {
  it('documents the exact one-PR-per-risk-area execution order', () => {
    const plan = readRepoFile('docs/security/ENTERPRISE_RELEASE_EXECUTION_PLAN_2026_06_24.md');

    expect(plan).toContain('| 1 | 1 | Deployment, final validation, owners, rollback control plane |');
    expect(plan).toContain('| 2 | 2 | Supabase RLS live validation |');
    expect(plan).toContain('| 3 | 3 | API hardening, BOLA/IDOR, rate limit, security CI |');
    expect(plan).toContain('| 4 | 4 | Stripe, MFA/IdP, upload scanner runtime proof |');
    expect(plan).toContain('| 5 | 5 | Audit-chain, observability, incident response, rollback, support communications |');
    expect(plan).toContain('| 6 | 6 | E2E route health, production smoke, enterprise UX, Trust Center, privacy/GDPR |');
    expect(plan).toContain('| 7 | 7 | External review package, final readiness, Go/No-Go |');
  });

  it('keeps Vercel recovery evidence honest and commit-specific', () => {
    const runbook = readRepoFile('docs/ops/VERCEL_DEPLOYMENT_RECOVERY_RUNBOOK.md');

    expect(runbook).toContain('exact commit under assessment');
    expect(runbook).toContain('Historical Vercel preview URLs from older PRs or commits');
    expect(runbook).toContain('curl -fsS "$RELEASE_BASE_URL/api/health"');
    expect(runbook).toContain('curl -fsS "$RELEASE_BASE_URL/api/ready"');
    expect(runbook).toContain('RELEASE_TARGET=enterprise node scripts/release/run-final-validation.mjs');
  });

  it('records Day 1 evidence as open until current deployment and final validation proof exist', () => {
    const evidence = JSON.parse(readRepoFile('docs/security/evidence/runtime/day1-deployment-final-validation-status.json'));

    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('blocked_not_complete');
    expect(evidence.currentDeploymentUrl).toBeNull();
    expect(evidence.currentBuildLogUrl).toBeNull();
    expect(evidence.decisionImpact).toContain('No-Go');
    expect(evidence.nonEvidence).toContain('historical Vercel preview URLs from other commits');
  });

  it('passes the repo-side Day 1 release control-plane gate', () => {
    const output = execFileSync('node', ['scripts/release/check-day1-release-control-plane.mjs'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    expect(output).toContain('Day 1 release control-plane gate passed');
  });
});
