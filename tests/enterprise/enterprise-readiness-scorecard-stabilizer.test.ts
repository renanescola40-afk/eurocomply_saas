import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  productionGateAlreadyCoversEvidence,
  relevantProductionGateRuns,
} from '../../scripts/release/stabilize-enterprise-readiness-scorecard.mjs';

const workflowPath = '.github/workflows/enterprise-readiness-scorecard-stabilizer.yml';
const scriptPath = 'scripts/release/stabilize-enterprise-readiness-scorecard.mjs';
const workflow = readFileSync(workflowPath, 'utf8');
const script = readFileSync(scriptPath, 'utf8');

const producerNames = [
  'CI','CodeQL','Semgrep','Secret Scanning','Scan repository for accidental secret exposure','Dependency Review','Actionlint','Public Claims Guard','Full Security Suite','Enterprise Production Gate','RISCK COMPLY Security CI','RISCK COMPLY Upload Security CI','Enterprise DAST','Dependency Vulnerability Proof','Distributed Rate Limit Runtime Proof','Auth RBAC Tenant Proof','Supabase Live RLS Validation','Production Runtime Proof','Audit Chain Runtime Proof','Production Provider Runtime Proof','Branch Protection Runtime Proof','Step-Up Runtime Proof','Stripe Runtime Evidence Promotion','Public Production Final','Final Technical Controls Proof','Recovery Resilience Proof','Enterprise Recovery Drill',
];
const retainedFanInNames = ['Auth RBAC Tenant Proof','Supabase Live RLS Validation','RISCK COMPLY Upload Security CI','Audit Chain Runtime Proof','Production Runtime Proof','Production Provider Runtime Proof','Branch Protection Runtime Proof','Step-Up Runtime Proof','Stripe Runtime Evidence Promotion','Public Production Final'];

describe('enterprise readiness scorecard terminal stabilizer', () => {
  it('is syntactically valid JavaScript', () => {
    expect(() => execFileSync(process.execPath, ['--check', scriptPath])).not.toThrow();
  });

  it('listens to the reviewed producer set while ignoring its own workflow-dispatched Production Gate completion', () => {
    for (const producer of producerNames) {
      expect(workflow).toContain(`      - ${producer}`);
      expect(script).toContain(`  '${producer}',`);
    }
    expect(new Set(producerNames).size).toBe(27);
    expect(workflow).toContain("github.event.workflow_run.name != 'Enterprise Production Gate'");
    expect(workflow).toContain("github.event.workflow_run.event != 'workflow_dispatch'");
    expect(workflow).toMatch(/workflow_run:[\s\S]*?branches: \[main\][\s\S]*?types: \[completed\]/);
    expect(workflow).not.toContain('Enterprise Readiness Scorecard\n');
    expect(workflow).not.toContain('pull_request_target:');
    expect(workflow).not.toContain('repository_dispatch:');
  });

  it('tracks every retained Enterprise Production Gate proof producer', () => {
    for (const producer of retainedFanInNames) {
      expect(workflow).toContain(`      - ${producer}`);
      expect(script).toContain(`  '${producer}',`);
    }
    expect(new Set(retainedFanInNames).size).toBe(10);
  });

  it('treats the isolated recovery drill as a material score producer without adding it to retained Production Gate evidence', () => {
    expect(workflow).toContain('      - Enterprise Recovery Drill');
    expect(script).toContain("  'Enterprise Recovery Drill',");
    expect(retainedFanInNames).not.toContain('Enterprise Recovery Drill');
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
    expect(workflow).toContain('group: enterprise-readiness-scorecard-stabilizer-${{ github.event.workflow_run.head_sha || inputs.target_sha || github.sha }}');
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
    expect(workflow).toContain('timeout-minutes: 35');
  });

  it('fails closed on inventory ambiguity while tolerating transient GitHub API pressure', () => {
    expect(script).toContain('const MAX_RUN_PAGES = 5;');
    expect(script).toContain('const MAX_SETTLE_ATTEMPTS = 10;');
    expect(script).toContain('const MAX_GATE_SETTLE_ATTEMPTS = 80;');
    expect(script).toContain('const QUIET_WINDOW_MS = 75_000;');
    expect(script).toContain('const MAX_API_ATTEMPTS = 5;');
    expect(script).toContain('const API_BACKOFF_CAP_MS = 30_000;');
    expect(script).toContain('status === 403 || status === 429 || status >= 500');
    expect(script).toContain("response.headers.get('retry-after')");
    expect(script).toContain("response.headers.get('x-ratelimit-reset')");
    expect(script).toContain('actions/runs?head_sha=${encodedSha}&per_page=${PER_PAGE}&page=${page}');
    expect(script).toContain('Exact-SHA run inventory exceeds bounded pagination');
    expect(script).toContain('Material evidence producers did not reach a bounded quiet terminal state');
    expect(script).toContain('A material evidence producer became active after the quiet-state check; refusing to dispatch');
    expect(script).toContain('A material evidence producer became active while the production gate was settling; refusing to dispatch');
  });

  it('refreshes the production gate before the scorecard when retained evidence is newer', () => {
    expect(script).toContain("export const ENTERPRISE_PRODUCTION_GATE_PATH = 'enterprise-production-gate.yml';");
    expect(script).toContain('productionGateAlreadyCoversEvidence');
    expect(script).toContain('await dispatchProductionGate(repository);');
    expect(script).toContain('await waitForTerminalProductionGate(repository, targetSha, upstreamCutoffMs, {');
    expect(script).toContain('refreshAlreadyDispatched: productionGateRefreshDispatched');
    expect(script).toContain('No terminal Enterprise Production Gate evaluation covers the latest material producer state');
    const gateDispatch = script.indexOf('await dispatchProductionGate(repository);');
    const gateWait = script.indexOf('await waitForTerminalProductionGate(repository, targetSha, upstreamCutoffMs, {');
    const scorecardDispatch = script.indexOf('await dispatchScorecard(repository);');
    expect(gateDispatch).toBeGreaterThan(-1);
    expect(gateWait).toBeGreaterThan(gateDispatch);
    expect(scorecardDispatch).toBeGreaterThan(gateWait);
  });

  it('treats success/failure as evaluated while excluding cancelled/skipped wrappers from gate selection', () => {
    expect(script).toContain("export const TERMINAL_EVALUATION_CONCLUSIONS = new Set(['success', 'failure']);");
    expect(script).toContain('export function isTerminalEvaluation(run)');
    expect(script).toContain("return run?.status === 'completed' && TERMINAL_EVALUATION_CONCLUSIONS.has(run?.conclusion);");
    expect(script).toContain('export function relevantProductionGateRuns(runs, targetSha, producerCutoffMs)');
    expect(script).toContain('.filter((run) => ACTIVE_RUN_STATUSES.has(run?.status) || isTerminalEvaluation(run))');
    expect(script).toContain('const latest = relevantProductionGateRuns(runs, targetSha, producerCutoffMs)[0];');
    expect(script).toContain('if (isTerminalEvaluation(latest)) return latest;');
    expect(script).not.toContain('Terminal Enterprise Production Gate ended with non-evaluation conclusion');
    expect(script).not.toContain("run?.status === 'completed' && run?.conclusion === 'success'");

    const sha = 'a'.repeat(40);
    const cutoff = Date.parse('2026-08-14T13:00:00Z');
    const gateRun = (overrides: Record<string, unknown>) => ({
      name: 'Enterprise Production Gate',
      head_sha: sha,
      status: 'completed',
      conclusion: 'success',
      created_at: '2026-08-14T13:01:00Z',
      ...overrides,
    });
    const runs = [
      gateRun({ status: 'completed', conclusion: 'skipped', created_at: '2026-08-14T13:05:00Z' }),
      gateRun({ status: 'completed', conclusion: 'cancelled', created_at: '2026-08-14T13:04:00Z' }),
      gateRun({ status: 'queued', conclusion: null, created_at: '2026-08-14T13:03:00Z' }),
      gateRun({ status: 'completed', conclusion: 'failure', created_at: '2026-08-14T13:02:00Z' }),
    ];

    expect(relevantProductionGateRuns(runs, sha, cutoff).map((run: { status?: string; conclusion?: string | null }) => [run.status, run.conclusion])).toEqual([
      ['queued', null],
      ['completed', 'failure'],
    ]);
    expect(productionGateAlreadyCoversEvidence(runs, sha, cutoff)).toBe(true);
    expect(productionGateAlreadyCoversEvidence(runs.slice(0, 2), sha, cutoff)).toBe(false);
    expect(workflow).toContain('accepts a terminal GO or NO_GO gate as a completed evaluation');
    expect(workflow).toContain('Terminal evaluation status never awards PASS');
  });

  it('dispatches only fixed existing workflows after proving main is still the target SHA', () => {
    expect(script).toContain("export const SCORECARD_WORKFLOW_PATH = 'enterprise-readiness-scorecard.yml';");
    expect(script).toContain('/git/ref/heads/main');
    expect(script).toContain('if (mainSha !== targetSha)');
    expect(script).toContain("{ method: 'POST', body: { ref: 'main' } }");
    expect(script).not.toMatch(/body:\s*\{\s*ref:\s*process\.env/);
  });

  it('requires scorecard creation after the latest producer completion before treating evidence as covered', () => {
    expect(script).toContain("const parsed = Date.parse(run?.created_at ?? '');");
    expect(script).toContain('if (createdTimestampMs(run) < producerCutoffMs) return false;');
    expect(script).toContain("return { dispatched: false, reason: 'scorecard-current', targetSha };");
  });

  it('surfaces a stable failure reason without weakening readiness or mutating production', () => {
    expect(script).toContain("writeOutput('reason', 'stabilizer-error');");
    expect(script).not.toMatch(/\bPASS\b/);
    expect(script).not.toContain('/deployments');
    expect(script).not.toContain('/environments');
    expect(script).not.toContain('/secrets');
    expect(workflow).toContain('does not mutate production');
  });
});
