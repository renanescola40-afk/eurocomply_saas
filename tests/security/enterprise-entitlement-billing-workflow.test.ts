import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/enterprise-entitlement-billing-reconciliation.yml', 'utf8');

describe('enterprise entitlement billing workflow', () => {
  it('checks out and verifies the exact assessed SHA', () => {
    expect(workflow).toContain('github.event.pull_request.head.sha || github.sha');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('git rev-parse HEAD');
  });

  it('uses deterministic installation and bounded execution', () => {
    expect(workflow).toContain('timeout-minutes: 20');
    expect(workflow).toContain('npm ci --ignore-scripts');
  });

  it('runs domain, migration and workflow contracts and retains evidence', () => {
    expect(workflow).toContain('entitlement-reconciliation.test.ts');
    expect(workflow).toContain('enterprise-entitlement-reconciliation-migration.test.ts');
    expect(workflow).toContain('report-entitlement-billing-drift.mjs');
    expect(workflow).toContain('retention-days: 90');
    expect(workflow).toContain('if-no-files-found: error');
  });
});
