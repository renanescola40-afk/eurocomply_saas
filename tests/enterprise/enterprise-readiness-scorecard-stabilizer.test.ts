import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/enterprise-readiness-scorecard-stabilizer.yml';
const scriptPath = 'scripts/release/stabilize-enterprise-readiness-scorecard.mjs';
const workflow = readFileSync(workflowPath, 'utf8');
const script = readFileSync(scriptPath, 'utf8');

const producerNames = [
  'CI',
  'CodeQL',
  'Semgrep',
  'Secret Scanning',
  'Scan repository for accidental secret exposure',
  'Dependency Review',
  'Actionlint',
  'Public Claims Guard',
  'Full Security Suite',
  'Enterprise Production Gate',
  'RISCK COMPLY Security CI',
  'Enterprise DAST',
  'Dependency Vulnerability Proof',
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

  it('listens to the full reviewed material producer set on main', () => {
    for (const producer of producerNames) {
      expect(workflow).toContain(`      - ${producer}`);
      expect(script).toContain(`  '${producer}',`);
    }

    expect(new Set(producerNames).size).toBe(20);
    expect(workflow).toMatch(/workflow_run:[\s\S]*?branches: \[main\][\s\S]*?types: \[completed\]/);
    expect(workflow).not.toContain('Enterprise Readiness Scorecard\n');
    expect(workflow).not.toContain('pull_request_target:');
    expect(workflow).not.toContain('repository_dispatch:');
  });

  it('debounces the producer storm before checkout or GitHub API access', () => {
    const debounceIndex = workflow.indexOf('- name: Debounce producer storm before checkout or API access');
    const checkoutIndex = workflow.indexOf('- name: Checkout exact producer SHA');
    const stabilizeIndex = workflow.indexOf('- name: Stabilize terminal exact-SHA scorecard');

    expect(debounceIndex).toBeGreaterThan(-1);
    expect(checkoutIndex).toBeGreaterThan(debounceIndex);
    expect(stabilizeIndex).toBeGreaterThan(checkoutIndex);
    expect(workflow).toContain("STABILIZER_DEBOUNCE_SECONDS: '90'");
    expect(workflow).toContain('run: sleep "$STABILIZER_DEBOUNCE_SECONDS"');
    expect(workflow).toContain("if: github.event_name == 'workflow_run'");
  });

  it('uses minimal write permission, exact-SHA checkout and a manual recovery entry point', () => {
    expect(workflow).toMatch(/permissions:\n  actions: write\n  contents: read/);
    expect(workflow).toContain(
      'group: enterprise-readiness-scorecard-stabilizer-${{ github.event.workflow_run.head_sha || inputs.target_sha || github.sha }}',
    );
    expect(workflow).toContain('cancel-in-progress: true');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('target_sha:');
    expect(workflow).toContain('TARGET_SHA: ${{ github.event.workflow_run.head_sha || inputs.target_sha || github.sha }}');
    expect(workflow).toContain('ref: ${{ env.TARGET_SHA }}');
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "$TARGET_SHA"');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('GITHUB_TOKEN: ${{ github.token }}');
    expect(workflow).not.toContain('secrets.');
    expect(workflow).not.toContain('environment: production');
  });

  it('fails closed on inventory ambiguity while tolerating transient GitHub API pressure', () => {
    expect(script).toContain('const MAX_RUN_PAGES = 5;');
    expect(script).toContain('const MAX_SETTLE_ATTEMPTS = 10;');
    expect(script).toContain('const QUIET_WINDOW_MS = 75_000;');
    expect(script).toContain('const MAX_API_ATTEMPTS = 5;');
    expect(script).toContain('const API_BACKOFF_CAP_MS = 30_000;');
    expect(script).toContain("status === 403 || status === 429 || status >= 500");
    expect(script).toContain("response.headers.get('retry-after')");
    expect(script).toContain("response.headers.get('x-ratelimit-reset')");
    expect(script).toContain('actions/runs?head_sha=${encodedSha}&per_page=${PER_PAGE}&page=${page}');
    expect(script).toContain('Exact-SHA run inventory exceeds bounded pagination');
    expect(script).toContain('Material evidence producers did not reach a bounded quiet terminal state');
    expect(script).toContain('A material evidence producer became active after the quiet-state check; refusing to dispatch');
  });

  it('dispatches only the fixed existing scorecard after proving main is still the target SHA', () => {
    expect(script).toContain("export const SCORECARD_WORKFLOW_PATH = 'enterprise-readiness-scorecard.yml';");
    expect(script).toContain('/git/ref/heads/main');
    expect(script).toContain('if (mainSha !== targetSha)');
    expect(script).toContain("{ method: 'POST', body: { ref: 'main' } }");
    expect(script).not.toMatch(/body:\s*\{\s*ref:\s*process\.env/);
  });

  it('requires scorecard creation after the latest producer completion before treating evidence as covered', () => {
    expect(script).toContain("const parsed = Date.parse(run?.created_at ?? '');");
    expect(script).toContain('if (createdTimestampMs(run) < producerCutoffMs) return false;');
    expect(script).toContain("run?.status === 'completed' && run?.conclusion === 'success'");
    expect(script).toContain("return { dispatched: false, reason: 'scorecard-current', targetSha };");
  });

  it('surfaces a stable failure reason without weakening readiness or mutating production', () => {
    expect(script).toContain("writeOutput('reason', 'stabilizer-error');");
    expect(script).not.toMatch(/\bPASS\b/);
    expect(script).not.toContain('/deployments');
    expect(script).not.toContain('/environments');
    expect(script).not.toContain('/secrets');
    expect(workflow).toContain('This workflow does not award PASS or mutate production.');
  });
});
