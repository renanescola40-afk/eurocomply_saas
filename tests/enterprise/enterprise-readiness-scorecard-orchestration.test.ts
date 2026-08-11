import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/enterprise-readiness-scorecard.yml', 'utf8');

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

function workflowRunProducers() {
  const match = workflow.match(/workflow_run:\n    workflows:\n([\s\S]*?)    types: \[completed\]/);
  if (!match) throw new Error('workflow_run producer block missing');

  return [...match[1].matchAll(/^      - (.+)$/gm)].map((entry) => entry[1].trim());
}

describe('enterprise readiness scorecard orchestration', () => {
  it('re-evaluates after every exact-SHA required check and runtime evidence producer completes', () => {
    expect(workflowRunProducers()).toEqual(expectedCompletionTriggers);
    expect(new Set(workflowRunProducers()).size).toBe(expectedCompletionTriggers.length);
    expect(workflowRunProducers()).not.toContain('Enterprise Readiness Scorecard');
  });

  it('limits workflow-run reevaluation to successful main completions and exact assessed SHA concurrency', () => {
    expect(workflow).toMatch(/workflow_run:[\s\S]*?types: \[completed\]\n    branches: \[main\]/);
    expect(workflow).toContain(
      'group: enterprise-readiness-scorecard-${{ github.event.workflow_run.head_sha || github.event.pull_request.head.sha || github.sha }}',
    );
    expect(workflow).toContain('cancel-in-progress: true');
    expect(workflow).toContain(
      "if: github.event_name != 'workflow_run' || github.event.workflow_run.conclusion == 'success'",
    );
    expect(workflow).not.toContain("github.run_id || 'active'");
  });

  it('keeps Open derived evidence observable without weakening integrity failures', () => {
    expect(workflow).toContain('node scripts/enterprise/run-repository-control-evidence-for-scorecard.mjs');
    expect(workflow).toContain('tests/enterprise/repository-control-scorecard-aggregation.test.mjs');
    expect(workflow).toContain('tests/enterprise/derived-scorecard-evidence-builder.test.mjs');
    for (const key of ['publicUx', 'accessibilityConsent', 'accountRecovery', 'providerFailure', 'stepUp']) {
      expect(workflow).toContain(`node scripts/enterprise/run-derived-scorecard-evidence-builder.mjs ${key}`);
    }
    expect(workflow).toContain('Sensitive-action step-up evidence remains NOT_VERIFIED');
    expect(workflow).not.toContain('continue-on-error');
  });

  it('publishes the canonical scorecard before enforcing the terminal GO decision on main only', () => {
    const uploadIndex = workflow.indexOf('- name: Upload scorecard artifact');
    const enforceIndex = workflow.indexOf('- name: Enforce enterprise scorecard decision');
    expect(uploadIndex).toBeGreaterThan(-1);
    expect(enforceIndex).toBeGreaterThan(uploadIndex);
    expect(workflow.slice(enforceIndex)).toContain("if: github.event_name != 'pull_request'");
    expect(workflow).toContain("decision=\"$(jq -r '.releaseDecision // \"NO_GO\"' \"$scorecard\")\"");
    expect(workflow).toContain('test "$decision" = "GO"');
  });

  it('keeps direct pull-request, push and manual entry points', () => {
    expect(workflow).toMatch(/pull_request:\n    branches: \[main\]/);
    expect(workflow).toMatch(/push:\n    branches: \[main\]/);
    expect(workflow).toContain('workflow_dispatch:');
  });
});
