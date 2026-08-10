import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { selectExactShaRun } from '../../scripts/enterprise/fetch-public-production-final-evidence.mjs';

const source = readFileSync('scripts/enterprise/fetch-public-production-final-evidence.mjs', 'utf8');
const sha = 'a'.repeat(40);

describe('public production final exact-SHA evidence fetch', () => {
  it('selects only successful manual final gate for exact main SHA', () => {
    const run = selectExactShaRun([
      { id: 10, path: '.github/workflows/public-production-final.yml', head_sha: sha, head_branch: 'main', event: 'workflow_dispatch', status: 'completed', conclusion: 'success', updated_at: '2026-08-10T18:00:00Z' },
      { id: 11, path: '.github/workflows/public-production-final.yml', head_sha: sha, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success', updated_at: '2026-08-10T18:01:00Z' },
      { id: 12, path: '.github/workflows/public-production-final.yml', head_sha: 'b'.repeat(40), head_branch: 'main', event: 'workflow_dispatch', status: 'completed', conclusion: 'success', updated_at: '2026-08-10T18:02:00Z' },
    ], sha);

    expect(run?.id).toBe(10);
  });

  it('requires the exact protected final artifact and all four P0 validators', () => {
    expect(source).toContain('public-production-final-validation-${targetSha}');
    expect(source).toContain('validateDeploymentRuntimeEvidence');
    expect(source).toContain('validateFinalValidationRuntimeEvidence');
    expect(source).toContain('validateObservabilityRuntimeEvidence');
    expect(source).toContain('validateRollbackRuntimeEvidence');
    expect(source).toContain("'docs/security/evidence/runtime/deployment-smoke-validation.json'");
    expect(source).toContain("'docs/security/evidence/runtime/final-validation-runner.json'");
    expect(source).toContain("'docs/security/evidence/runtime/observability-smoke-validation.json'");
    expect(source).toContain("'docs/security/evidence/runtime/rollback-dry-run-validation.json'");
  });

  it('validates the complete bundle before replacing canonical evidence files', () => {
    const validationIndex = source.indexOf('const validation = validatePublicFinalBundle');
    const writeIndex = source.indexOf('writeFileSync(output');
    expect(validationIndex).toBeGreaterThan(-1);
    expect(writeIndex).toBeGreaterThan(validationIndex);
  });

  it('does not delete existing producer evidence when no exact final run exists', () => {
    const noRunIndex = source.indexOf('if (!run)');
    const firstRemovalIndex = source.indexOf('rmSync(output');
    expect(noRunIndex).toBeGreaterThan(-1);
    expect(firstRemovalIndex).toBeGreaterThan(noRunIndex);
  });
});
