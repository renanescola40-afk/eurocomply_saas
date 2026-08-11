import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/enterprise-readiness-scorecard-stabilizer.yml';
const scriptPath = 'scripts/release/stabilize-enterprise-readiness-scorecard.mjs';
const workflow = readFileSync(workflowPath, 'utf8');
const script = readFileSync(scriptPath, 'utf8');

const producerNames = [
  'Distributed Rate Limit Runtime Proof',
  'Auth RBAC Tenant Proof',
  'Supabase Live RLS Validation',
  'Production Runtime Proof',
  'Branch Protection Runtime Proof',
  'Final Technical Controls Proof',
  'Recovery Resilience Proof',
];

describe('enterprise readiness scorecard terminal stabilizer', () => {
  it('is syntactically valid JavaScript', () => {
    expect(() => execFileSync(process.execPath, ['--check', scriptPath])).not.toThrow();
  });

  it('listens only to the reviewed runtime evidence producer set on main', () => {
    for (const producer of producerNames) {
      expect(workflow).toContain(`      - ${producer}`);
      expect(script).toContain(`  '${producer}',`);
    }

    expect(workflow).toMatch(/workflow_run:[\s\S]*?branches: \[main\][\s\S]*?types: \[completed\]/);
    expect(workflow).not.toContain('Enterprise Readiness Scorecard\n');
    expect(workflow).not.toContain('pull_request_target:');
    expect(workflow).not.toContain('repository_dispatch:');
  });

  it('uses minimal write permission and trusted exact-SHA checkout', () => {
    expect(workflow).toMatch(/permissions:\n  actions: write\n  contents: read/);
    expect(workflow).toContain('group: enterprise-readiness-scorecard-stabilizer-${{ github.event.workflow_run.head_sha }}');
    expect(workflow).toContain('cancel-in-progress: true');
    expect(workflow).toContain('ref: ${{ github.event.workflow_run.head_sha }}');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('GITHUB_TOKEN: ${{ github.token }}');
    expect(workflow).not.toContain('secrets.');
    expect(workflow).not.toContain('environment: production');
  });

  it('fails closed on inventory ambiguity and bounds GitHub API consumption', () => {
    expect(script).toContain('const MAX_RUN_PAGES = 3;');
    expect(script).toContain('const MAX_SETTLE_ATTEMPTS = 10;');
    expect(script).toContain('const QUIET_WINDOW_MS = 75_000;');
    expect(script).toContain('actions/runs?head_sha=${encodedSha}&per_page=${PER_PAGE}&page=${page}');
    expect(script).toContain('Exact-SHA run inventory exceeds bounded pagination');
    expect(script).toContain('Runtime evidence producers did not reach a bounded quiet terminal state');
    expect(script).toContain('A runtime evidence producer became active after the quiet-state check; refusing to dispatch');
  });

  it('dispatches only the fixed existing scorecard after proving main is still the target SHA', () => {
    expect(script).toContain("export const SCORECARD_WORKFLOW_PATH = 'enterprise-readiness-scorecard.yml';");
    expect(script).toContain('/git/ref/heads/main');
    expect(script).toContain("if (mainSha !== targetSha)");
    expect(script).toContain("{ method: 'POST', body: { ref: 'main' } }");
    expect(script).not.toMatch(/body:\s*\{\s*ref:\s*process\.env/);
  });

  it('requires scorecard creation after the latest producer completion before treating evidence as covered', () => {
    expect(script).toContain("const parsed = Date.parse(run?.created_at ?? '');");
    expect(script).toContain('if (createdTimestampMs(run) < producerCutoffMs) return false;');
    expect(script).toContain("run?.status === 'completed' && run?.conclusion === 'success'");
    expect(script).toContain("return { dispatched: false, reason: 'scorecard-current', targetSha };");
  });

  it('never awards readiness status or mutates production', () => {
    expect(script).not.toMatch(/\bPASS\b/);
    expect(script).not.toContain('/deployments');
    expect(script).not.toContain('/environments');
    expect(script).not.toContain('/secrets');
    expect(workflow).toContain('It does not award PASS or mutate production.');
  });
});
