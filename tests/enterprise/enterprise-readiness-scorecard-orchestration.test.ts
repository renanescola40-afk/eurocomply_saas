import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/enterprise-readiness-scorecard.yml', 'utf8');

function workflowRunProducers() {
  const match = workflow.match(/workflow_run:\n    workflows:\n([\s\S]*?)    types: \[completed\]/);
  if (!match) throw new Error('workflow_run producer block missing');

  return [...match[1].matchAll(/^      - (.+)$/gm)].map((entry) => entry[1].trim());
}

describe('enterprise readiness scorecard orchestration', () => {
  it('reacts only to runtime evidence producers after the direct push/PR assessment', () => {
    expect(workflowRunProducers()).toEqual([
      'Distributed Rate Limit Runtime Proof',
      'Auth RBAC Tenant Proof',
      'Supabase Live RLS Validation',
      'Production Runtime Proof',
      'Branch Protection Runtime Proof',
      'Final Technical Controls Proof',
      'Recovery Resilience Proof',
    ]);

    for (const redundantProducer of [
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
    ]) {
      expect(workflowRunProducers()).not.toContain(redundantProducer);
    }
  });

  it('limits workflow-run reevaluation to main and coalesces only the same exact SHA', () => {
    expect(workflow).toMatch(/workflow_run:[\s\S]*?types: \[completed\]\n    branches: \[main\]/);
    expect(workflow).toContain(
      'group: enterprise-readiness-scorecard-${{ github.event.workflow_run.head_sha || github.event.pull_request.head.sha || github.sha }}',
    );
    expect(workflow).toContain('cancel-in-progress: true');
    expect(workflow).not.toContain(
      'group: enterprise-readiness-scorecard-${{ github.event.workflow_run.head_sha || github.ref }}',
    );
  });

  it('keeps direct pull-request, push and manual entry points', () => {
    expect(workflow).toMatch(/pull_request:\n    branches: \[main\]/);
    expect(workflow).toMatch(/push:\n    branches: \[main\]/);
    expect(workflow).toContain('workflow_dispatch:');
  });
});
