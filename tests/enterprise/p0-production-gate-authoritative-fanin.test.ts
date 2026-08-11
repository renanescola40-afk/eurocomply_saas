import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/p0-runtime-evidence.yml', 'utf8');

const gateWorkflowPath = '.github/workflows/enterprise-production-gate.yml';

describe('P0 authoritative Enterprise Production Gate fan-in', () => {
  it('observes Enterprise Production Gate completions without granting success from the gate conclusion', () => {
    expect(workflow).toContain('- Enterprise Production Gate');
    expect(workflow).toContain(`github.event.workflow_run.path == '${gateWorkflowPath}'`);
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'failure'");
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
  });

  it('hydrates individually validated exact-SHA production-gate documents before generating the authoritative register', () => {
    const hydrate = workflow.indexOf('node scripts/enterprise/fetch-production-gate-p0-evidence.mjs');
    const generate = workflow.indexOf('node scripts/security/generate-p0-runtime-evidence-register.mjs');
    expect(hydrate).toBeGreaterThan(-1);
    expect(generate).toBeGreaterThan(hydrate);
    expect(workflow).toContain('p0-production-gate-evidence-hydration.json');
    expect(workflow).toContain('tests/enterprise/p0-production-gate-evidence-hydration.test.mjs');
  });

  it('keeps the workflow read-only and fail-closed', () => {
    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('continue-on-error: true');
  });
});
