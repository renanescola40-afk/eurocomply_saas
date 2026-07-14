import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('production release profiles', () => {
  it('dispatches public and enterprise releases to different preflights and runners', () => {
    const dispatcher = read('scripts/release/run-public-production-release.mjs');

    expect(dispatcher).toContain("releaseTarget === 'enterprise'");
    expect(dispatcher).toContain("import('./check-enterprise-release-env.mjs')");
    expect(dispatcher).toContain("import('./run-public-production-release-v2.mjs')");
    expect(dispatcher).toContain("releaseTarget === 'public-production'");
    expect(dispatcher).toContain("import('./check-public-production-release-env.mjs')");
    expect(dispatcher).toContain("import('./run-public-production-release-final.mjs')");
  });

  it('keeps P0 runtime evidence in the public profile without enterprise-only gates', () => {
    const publicRunner = read('scripts/release/run-public-production-release-final.mjs');

    expect(publicRunner).toContain('npm run security:rls:live');
    expect(publicRunner).toContain('npm run release:deployment-smoke');
    expect(publicRunner).toContain('npm run release:observability-smoke');
    expect(publicRunner).toContain('npm run release:rollback:dry-run');
    expect(publicRunner).toContain('npm run security:p0-runtime-gap:strict');
    expect(publicRunner).not.toContain('write-enterprise-runtime-evidence');
    expect(publicRunner).not.toContain('release:enterprise-runtime-evidence');
    expect(publicRunner).toContain('requiresEnterpriseRuntimeEvidence: false');
    expect(publicRunner).toContain('requiresExternalReviewEvidence: false');
  });

  it('does not require enterprise-only provider credentials in the public preflight', () => {
    const publicPreflight = read('scripts/release/check-public-production-release-env.mjs');

    expect(publicPreflight).toContain('NEXT_PUBLIC_SENTRY_DSN');
    expect(publicPreflight).not.toContain("hasAll(['SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN'])");
    expect(publicPreflight).not.toContain('MALWARE_SCANNER_PROVIDER');
    expect(publicPreflight).toContain('enterpriseOnlyControlsExcluded');
  });

  it('keeps the public workflow scoped to public artifacts and credentials', () => {
    const workflow = read('.github/workflows/public-production-final.yml');

    expect(workflow).toContain('RELEASE_TARGET: public-production');
    expect(workflow).toContain('public-production-release-env-readiness.json');
    expect(workflow).toContain('observability-smoke-validation.json');
    expect(workflow).not.toContain('enterprise-runtime-evidence.json');
    expect(workflow).not.toContain('SENTRY_AUTH_TOKEN:');
    expect(workflow).not.toContain('RISCK_COMPLY_ENTERPRISE_RELEASE:');
  });

  it('preserves the enterprise runner as an explicit enterprise profile', () => {
    const enterpriseRunner = read('scripts/release/run-public-production-release-v2.mjs');

    expect(enterpriseRunner).toContain("const releaseTarget = process.env.RELEASE_TARGET || 'enterprise'");
    expect(enterpriseRunner).toContain('enterprise-runtime-evidence.json');
    expect(enterpriseRunner).toContain("RISCK_COMPLY_ENTERPRISE_RELEASE: 'true'");
  });
});
