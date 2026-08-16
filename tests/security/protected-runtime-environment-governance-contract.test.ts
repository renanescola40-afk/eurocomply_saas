import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const productionProofs = [
  ['.github/workflows/step-up-runtime-proof.yml', 'validate-step-up-provider'],
  ['.github/workflows/audit-chain-runtime-proof.yml', 'validate-audit-chain-runtime'],
  ['.github/workflows/production-provider-runtime-proof.yml', 'validate-production-providers'],
  ['.github/workflows/production-runtime-proof.yml', 'validate-production-runtime'],
] as const;

describe('protected runtime evidence environment governance', () => {
  for (const [path, protectedJob] of productionProofs) {
    it(`${path} proves Production governance before loading protected secrets`, () => {
      const workflow = read(path);
      const governanceJob = workflow.indexOf('  production-environment-governance:');
      const protectedBoundary = workflow.indexOf(`  ${protectedJob}:`);

      expect(governanceJob).toBeGreaterThan(-1);
      expect(protectedBoundary).toBeGreaterThan(governanceJob);

      const preflight = workflow.slice(governanceJob, protectedBoundary);
      expect(preflight).toContain('GITHUB_TOKEN: ${{ github.token }}');
      expect(preflight).toContain('GITHUB_ENVIRONMENT_NAME: Production');
      expect(preflight).toContain("REQUIRE_PROTECTED_BRANCHES: 'true'");
      expect(preflight).toContain('node scripts/security/check-github-environment-governance.mjs');
      expect(preflight).toContain('test "$GITHUB_REF_NAME" = "main"');
      expect(preflight).not.toMatch(/secrets\./);

      const protectedJobText = workflow.slice(protectedBoundary);
      expect(protectedJobText).toContain('needs: production-environment-governance');
      expect(protectedJobText).toContain('environment: Production');
    });
  }

  it('Recovery requires a pre-existing governed production-recovery environment before secrets or rollback', () => {
    const workflow = read('.github/workflows/recovery-resilience-proof.yml');
    const governanceJob = workflow.indexOf('  recovery-environment-governance:');
    const protectedBoundary = workflow.indexOf('  recovery-proof:');

    expect(governanceJob).toBeGreaterThan(-1);
    expect(protectedBoundary).toBeGreaterThan(governanceJob);

    const preflight = workflow.slice(governanceJob, protectedBoundary);
    expect(preflight).toContain('GITHUB_TOKEN: ${{ github.token }}');
    expect(preflight).toContain('GITHUB_ENVIRONMENT_NAME: production-recovery');
    expect(preflight).toContain("REQUIRE_PROTECTED_BRANCHES: 'true'");
    expect(preflight).toContain('node scripts/security/check-github-environment-governance.mjs');
    expect(preflight).toContain('EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK');
    expect(preflight).toContain('test "$GITHUB_REF_NAME" = "main"');
    expect(preflight).not.toMatch(/secrets\./);

    const protectedJobText = workflow.slice(protectedBoundary);
    expect(protectedJobText).toContain('needs: recovery-environment-governance');
    expect(protectedJobText).toContain('environment: production-recovery');
  });
});
