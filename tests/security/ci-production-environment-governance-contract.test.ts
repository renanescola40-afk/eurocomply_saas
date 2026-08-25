import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const ciWorkflow = readFileSync(
  join(process.cwd(), '.github/workflows/ci.yml'),
  'utf8',
);
const vercelProductionWorkflow = readFileSync(
  join(process.cwd(), '.github/workflows/vercel-production.yml'),
  'utf8',
);
const runtimeCloseoutWorkflow = readFileSync(
  join(process.cwd(), '.github/workflows/enterprise-runtime-evidence-closeout.yml'),
  'utf8',
);

describe('production environment governance boundaries', () => {
  it('keeps mutable live environment state out of pull-request quality checks', () => {
    expect(ciWorkflow).toContain('permissions:');
    expect(ciWorkflow).toContain('contents: read');
    expect(ciWorkflow).not.toContain('Production deployment environment governance gate');
    expect(ciWorkflow).not.toContain('GITHUB_ENVIRONMENT_NAME');
    expect(ciWorkflow).not.toContain('check-github-environment-governance.mjs');
    expect(ciWorkflow).not.toMatch(/secrets\./);
  });

  it('fails closed on Production governance before the Vercel job can load protected secrets', () => {
    const governance = vercelProductionWorkflow.indexOf(
      'Verify Production environment governance before protected secrets',
    );
    const protectedJob = vercelProductionWorkflow.indexOf('  deploy-production:');

    expect(governance).toBeGreaterThan(-1);
    expect(protectedJob).toBeGreaterThan(governance);

    const preflight = vercelProductionWorkflow.slice(0, protectedJob);
    expect(preflight).toContain('GITHUB_TOKEN: ${{ github.token }}');
    expect(preflight).toContain('GITHUB_ENVIRONMENT_NAME: Production');
    expect(preflight).toContain("REQUIRE_PROTECTED_BRANCHES: 'true'");
    expect(preflight).toContain('node scripts/security/check-github-environment-governance.mjs');
    expect(preflight).not.toMatch(/secrets\./);

    const protectedBoundary = vercelProductionWorkflow.slice(protectedJob);
    expect(protectedBoundary).toContain('environment: production');
  });

  it('passes canonical rollback authority into the governed Vercel job', () => {
    const protectedJob = vercelProductionWorkflow.indexOf('  deploy-production:');
    expect(protectedJob).toBeGreaterThan(-1);

    const protectedBoundary = vercelProductionWorkflow.slice(protectedJob);
    expect(protectedBoundary).toContain(
      'RELEASE_ROLLBACK_TARGET_URL: ${{ vars.RELEASE_ROLLBACK_TARGET_URL }}',
    );
    expect(protectedBoundary).toContain(
      'RELEASE_ROLLBACK_TARGET_SHA: ${{ vars.RELEASE_ROLLBACK_TARGET_SHA }}',
    );
    expect(protectedBoundary).toContain(
      'RELEASE_ROLLBACK_TARGET_VALIDATED: ${{ vars.RELEASE_ROLLBACK_TARGET_VALIDATED }}',
    );

    expect(protectedBoundary).not.toMatch(/RELEASE_ROLLBACK_TARGET_URL:\s*https?:\/\//);
    expect(protectedBoundary).not.toMatch(/RELEASE_ROLLBACK_TARGET_SHA:\s*[0-9a-f]{40}/i);
    expect(protectedBoundary).not.toContain('RELEASE_ROLLBACK_TARGET_VALIDATED: true');
  });

  it('fails closed on closeout governance before the runtime evidence job can load protected secrets', () => {
    const governanceJob = runtimeCloseoutWorkflow.indexOf('  environment-governance:');
    const protectedJob = runtimeCloseoutWorkflow.indexOf('  closeout:');

    expect(governanceJob).toBeGreaterThan(-1);
    expect(protectedJob).toBeGreaterThan(governanceJob);

    const preflight = runtimeCloseoutWorkflow.slice(governanceJob, protectedJob);
    expect(preflight).toContain('GITHUB_TOKEN: ${{ github.token }}');
    expect(preflight).toContain('GITHUB_ENVIRONMENT_NAME: enterprise-production-closeout');
    expect(preflight).toContain("REQUIRE_PROTECTED_BRANCHES: 'true'");
    expect(preflight).toContain('node scripts/security/check-github-environment-governance.mjs');
    expect(preflight).not.toMatch(/secrets\./);

    const protectedBoundary = runtimeCloseoutWorkflow.slice(protectedJob);
    expect(protectedBoundary).toContain('needs: [contract, environment-governance]');
    expect(protectedBoundary).toContain('environment: enterprise-production-closeout');
  });
});
