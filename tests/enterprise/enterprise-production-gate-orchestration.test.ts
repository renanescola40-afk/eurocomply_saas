import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/enterprise-production-gate.yml', 'utf8');

function workflowRunProducers() {
  const match = workflow.match(/workflow_run:\n    workflows:\n([\s\S]*?)    types: \[completed\]/);
  if (!match) throw new Error('workflow_run producer block missing');
  return [...match[1].matchAll(/^      - (.+)$/gm)].map((entry) => entry[1].trim());
}

describe('enterprise production gate retained-proof orchestration', () => {
  it('re-evaluates after each approved retained runtime-proof producer', () => {
    expect(workflowRunProducers()).toEqual([
      'Auth RBAC Tenant Proof',
      'Audit Chain Runtime Proof',
      'Production Provider Runtime Proof',
      'Branch Protection Runtime Proof',
      'Step-Up Runtime Proof',
      'Stripe Runtime Evidence Promotion',
    ]);
    expect(workflow).toMatch(/workflow_run:[\s\S]*?types: \[completed\]\n    branches: \[main\]/);
    expect(workflow).not.toContain('Enterprise Production Gate\n      - Enterprise Production Gate');
  });

  it('binds workflow-run re-evaluation and release evidence to the producer SHA', () => {
    const directTargetExpression = '${{ github.event.workflow_run.head_sha || github.sha }}';
    expect(workflow).toContain(`TARGET_SHA: ${directTargetExpression}`);
    expect(workflow).toContain(`RELEASE_COMMIT_SHA: ${directTargetExpression}`);
    expect(workflow).toContain(`RELEASE_BUILD_SHA: ${directTargetExpression}`);
    expect(workflow).toContain('ref: ${{ env.TARGET_SHA }}');
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "$TARGET_SHA"');
    expect(workflow).toContain('test "$main_sha" = "$TARGET_SHA"');
    expect(workflow).toContain('name: enterprise-production-final-evidence-${{ env.TARGET_SHA }}');
  });

  it('hydrates retained proofs before the authoritative release runner executes', () => {
    const hydrate = workflow.indexOf('run: node scripts/release/hydrate-enterprise-retained-runtime-evidence.mjs');
    const release = workflow.indexOf('run: npm run release:production-final');
    expect(hydrate).toBeGreaterThan(-1);
    expect(release).toBeGreaterThan(hydrate);
    expect(workflow).toContain("RETAINED_PROOF_SOURCE_WORKFLOW: ${{ github.event_name == 'workflow_run' && github.event.workflow_run.name || '' }}");
    expect(workflow).toContain("RETAINED_PROOF_SOURCE_WORKFLOW_PATH: ${{ github.event_name == 'workflow_run' && github.event.workflow_run.path || '' }}");
    expect(workflow).toContain("RETAINED_PROOF_SOURCE_RUN_ID: ${{ github.event_name == 'workflow_run' && github.event.workflow_run.id || '' }}");
    expect(workflow).toContain('release-validation/retained-runtime-evidence-hydration.json');
    expect(workflow).toContain('.sourceWorkflowPath // .sourceWorkflowName // "direct gate"');
  });

  it('keeps the fan-in read-only and fail-closed', () => {
    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('actions: write');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('continue-on-error: true');
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(workflow).toContain("github.event.workflow_run.conclusion != 'success' && github.run_id || 'active'");
    expect(workflow).toContain('cancel-in-progress: true');
  });

  it('retains direct PR, push and manual release entry points', () => {
    expect(workflow).toMatch(/pull_request:\n    branches: \[main\]/);
    expect(workflow).toMatch(/push:\n    branches: \[main\]/);
    expect(workflow).toContain('workflow_dispatch:');
  });
});
