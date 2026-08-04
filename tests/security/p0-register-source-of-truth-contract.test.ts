import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const policy = readFileSync('docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md', 'utf8');
const evidenceWorkflow = readFileSync('.github/workflows/p0-runtime-evidence.yml', 'utf8');
const gapWorkflow = readFileSync('.github/workflows/p0-runtime-gap-report.yml', 'utf8');
const finalWorkflow = readFileSync('.github/workflows/p0-final-release-gate.yml', 'utf8');
const evaluator = readFileSync('scripts/security/evaluate-p0-runtime-evidence.mjs', 'utf8');
const generator = readFileSync('scripts/security/generate-p0-runtime-evidence-register.mjs', 'utf8');
const validator = readFileSync('scripts/security/validate-generated-p0-runtime-evidence-register.mjs', 'utf8');

describe('P0 evidence register source-of-truth contract', () => {
  it('keeps the committed policy fail-closed and non-current', () => {
    expect(policy).toContain('Policy metadata only');
    expect(policy).not.toContain('Current final decision:');
    const dataRows = policy.split('\n').filter((line) => line.startsWith('| ') && !line.includes('Evidence item') && !line.includes('---'));
    expect(dataRows).toHaveLength(16);
    expect(dataRows.every((line) => line.includes('| Open |'))).toBe(true);
  });

  it('derives status from canonical evidence instead of Markdown state', () => {
    expect(evaluator).toContain('requireRegisterStatus = false');
    expect(evaluator).toContain('derivedStatus = evidence.evidenceSatisfied');
    expect(generator).toContain('requireRegisterStatus: false');
    expect(generator).toContain("decision = blocked === 0 ? 'GO' : 'NO_GO'");
  });

  it('uses one generated schema and removes the competing legacy renderer', () => {
    expect(existsSync('scripts/security/derive-p0-runtime-evidence-register.mjs')).toBe(false);
    expect(existsSync('scripts/security/p0-runtime-evidence-derived-register.test.mjs')).toBe(false);
    expect(generator).toContain('risck-comply.p0-runtime-evidence-register.v1');
    expect(validator).toContain('risck-comply.p0-runtime-evidence-register.v1');
  });

  it('integrates generation and validation into every P0 workflow', () => {
    for (const workflow of [evidenceWorkflow, gapWorkflow, finalWorkflow]) {
      expect(workflow).toContain('generate-p0-runtime-evidence-register.mjs');
      expect(workflow).toContain('validate-generated-p0-runtime-evidence-register.mjs');
      expect(workflow).not.toContain('derive-p0-runtime-evidence-register.mjs');
      expect(workflow).toContain('persist-credentials: false');
    }
  });

  it('binds workflows to the exact assessed SHA and immutable artifacts', () => {
    for (const workflow of [evidenceWorkflow, gapWorkflow, finalWorkflow]) {
      expect(workflow).toContain('github.event.pull_request.head.sha || github.sha');
      expect(workflow).toContain('test "$(git rev-parse HEAD)" = "$ASSESSED_SHA"');
      expect(workflow).toContain('retention-days: 365');
    }
  });
});
