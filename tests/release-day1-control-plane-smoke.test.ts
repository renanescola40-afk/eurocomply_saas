import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readRepoFile(path: string) {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

describe('day 1 release gate smoke test', () => {
  it('keeps the seven day execution order documented', () => {
    const plan = readRepoFile('docs/security/ENTERPRISE_RELEASE_EXECUTION_PLAN_2026_06_24.md');

    expect(plan).toContain('| 1 | 1 | Deployment, final validation, owners, rollback control plane |');
    expect(plan).toContain('| 7 | 7 | External review package, final readiness, Go/No-Go |');
    expect(plan).toContain('## Go / No-Go definition');
  });

  it('keeps the deployment recovery runbook tied to the assessed commit', () => {
    const runbook = readRepoFile('docs/ops/VERCEL_DEPLOYMENT_RECOVERY_RUNBOOK.md');

    expect(runbook).toContain('exact commit under assessment');
    expect(runbook).toContain('/api/health');
    expect(runbook).toContain('/api/ready');
  });

  it('passes the repo-side gate', () => {
    const output = execFileSync('node', ['scripts/release/check-day1-release-control-plane.mjs'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    expect(output).toContain('Day 1 release control-plane gate passed');
  });
});
