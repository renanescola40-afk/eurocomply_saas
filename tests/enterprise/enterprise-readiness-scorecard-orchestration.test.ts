import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const scorecardWorkflow = readFileSync('.github/workflows/enterprise-readiness-scorecard.yml', 'utf8');
const stabilizerWorkflow = readFileSync('.github/workflows/enterprise-readiness-scorecard-stabilizer.yml', 'utf8');

const expectedCompletionTriggers = [
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
  'RISCK COMPLY Upload Security CI',
  'Enterprise DAST',
  'Dependency Vulnerability Proof',
  'Distributed Rate Limit Runtime Proof',
  'Auth RBAC Tenant Proof',
  'Supabase Live RLS Validation',
  'Production Runtime Proof',
  'Audit Chain Runtime Proof',
  'Production Provider Runtime Proof',
  'Branch Protection Runtime Proof',
  'Step-Up Runtime Proof',
  'Stripe Runtime Evidence Promotion',
  'Public Production Final',
  'Final Technical Controls Proof',
  'Recovery Resilience Proof',
  'Enterprise Recovery Drill',
];

function stabilizerProducers() {
  const match = stabilizerWorkflow.match(/workflow_run:\n    workflows:\n([\s\S]*?)    branches: \[main\]/);
  if (!match) throw new Error('stabilizer workflow_run producer block missing');

  return [...match[1].matchAll(/^      - (.+)$/gm)].map((entry) => entry[1].trim());
}

describe('enterprise readiness scorecard orchestration', () => {
  it('uses the stabilizer as the sole material-producer completion fan-in while suppressing self-dispatched Gate feedback', () => {
    expect(stabilizerProducers()).toEqual(expectedCompletionTriggers);
    expect(new Set(stabilizerProducers()).size).toBe(expectedCompletionTriggers.length);
    expect(stabilizerProducers()).not.toContain('Enterprise Readiness Scorecard');
    expect(stabilizerProducers()).toContain('Enterprise Production Gate');
    expect(stabilizerProducers()).toContain('Public Production Final');
    expect(stabilizerProducers()).toContain('Enterprise Recovery Drill');
    expect(stabilizerWorkflow).toContain("github.event.workflow_run.name != 'Enterprise Production Gate'");
    expect(stabilizerWorkflow).toContain("github.event.workflow_run.event != 'workflow_dispatch'");

    expect(scorecardWorkflow).not.toContain('workflow_run:');
    expect(scorecardWorkflow).not.toContain('github.event.workflow_run');
    for (const producer of expectedCompletionTriggers) {
      expect(scorecardWorkflow).not.toContain(`      - ${producer}\n`);
    }
  });

  it('keeps exact-SHA concurrency for direct PR, push and terminal manual runs', () => {
    expect(scorecardWorkflow).toContain(
      'group: enterprise-readiness-scorecard-${{ github.event.pull_request.head.sha || github.sha }}',
    );
    expect(scorecardWorkflow).toContain('cancel-in-progress: true');
    expect(scorecardWorkflow).toContain(
      'ASSESSED_SHA: ${{ github.event.pull_request.head.sha || github.sha }}',
    );
    expect(scorecardWorkflow).not.toContain("github.run_id || 'active'");
  });

  it('discovers exact-SHA retained runtime evidence instead of depending on triggering producer IDs', () => {
    for (const sourceRunVariable of [
      'RATE_LIMIT_RUNTIME_SOURCE_RUN_ID',
      'AUTH_RBAC_RUNTIME_SOURCE_RUN_ID',
      'SUPABASE_RLS_RUNTIME_SOURCE_RUN_ID',
      'PRODUCTION_RUNTIME_SOURCE_RUN_ID',
      'BRANCH_PROTECTION_RUNTIME_SOURCE_RUN_ID',
      'FINAL_TECHNICAL_RUNTIME_SOURCE_RUN_ID',
      'RECOVERY_RUNTIME_SOURCE_RUN_ID',
    ]) {
      expect(scorecardWorkflow).not.toContain(sourceRunVariable);
    }

    for (const fetcher of [
      'fetch-distributed-rate-limit-evidence.mjs',
      'fetch-auth-rbac-evidence.mjs',
      'fetch-supabase-rls-evidence.mjs',
      'fetch-production-runtime-evidence.mjs',
      'fetch-branch-protection-runtime-evidence.mjs',
      'fetch-final-technical-controls-evidence.mjs',
      'fetch-recovery-resilience-evidence.mjs',
    ]) {
      expect(scorecardWorkflow).toContain(fetcher);
    }
  });

  it('keeps Open derived evidence observable without weakening integrity failures', () => {
    expect(scorecardWorkflow).toContain('node scripts/enterprise/run-repository-control-evidence-for-scorecard.mjs');
    expect(scorecardWorkflow).toContain('tests/enterprise/repository-control-scorecard-aggregation.test.mjs');
    expect(scorecardWorkflow).toContain('tests/enterprise/derived-scorecard-evidence-builder.test.mjs');
    for (const key of ['publicUx', 'accessibilityConsent', 'accountRecovery', 'providerFailure', 'stepUp']) {
      expect(scorecardWorkflow).toContain(`node scripts/enterprise/run-derived-scorecard-evidence-builder.mjs ${key}`);
    }
    expect(scorecardWorkflow).toContain('Sensitive-action step-up evidence remains NOT_VERIFIED');
    expect(scorecardWorkflow).not.toContain('continue-on-error');
  });

  it('publishes the canonical scorecard before enforcing the terminal GO decision on main only', () => {
    const uploadIndex = scorecardWorkflow.indexOf('- name: Upload scorecard artifact');
    const enforceIndex = scorecardWorkflow.indexOf('- name: Enforce enterprise scorecard decision');
    expect(uploadIndex).toBeGreaterThan(-1);
    expect(enforceIndex).toBeGreaterThan(uploadIndex);
    expect(scorecardWorkflow.slice(enforceIndex)).toContain("if: github.event_name != 'pull_request'");
    expect(scorecardWorkflow).toContain(`decision="$(jq -r '.releaseDecision // "NO_GO"' "$scorecard")"`);
    expect(scorecardWorkflow).toContain('test "$decision" = "GO"');
  });

  it('keeps direct pull-request, push and manual entry points', () => {
    expect(scorecardWorkflow).toMatch(/pull_request:\n    branches: \[main\]/);
    expect(scorecardWorkflow).toMatch(/push:\n    branches: \[main\]/);
    expect(scorecardWorkflow).toContain('workflow_dispatch:');
  });
});
