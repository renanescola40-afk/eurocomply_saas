import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/public-commercial-production.yml', 'utf8');
const enterpriseWorkflow = readFileSync('.github/workflows/vercel-production.yml', 'utf8');
const rollbackResolver = readFileSync('scripts/release/resolve-public-production-rollback.mjs', 'utf8');

describe('Public Commercial GA Vercel production lane', () => {
  it('keeps Public GA independent from Enterprise exact-SHA evidence producers', () => {
    expect(workflow).toContain('name: Public Commercial GA Production');
    expect(workflow).toContain('DEPLOY_PUBLIC_GA');
    expect(workflow).toContain('RELEASE_TARGET: public-production');

    expect(workflow).not.toContain('fetch-audit-chain-runtime-evidence');
    expect(workflow).not.toContain('fetch-supabase-rls-evidence');
    expect(workflow).not.toContain('Recovery Resilience Proof');
    expect(workflow).not.toContain('release:enterprise-readiness');
    expect(workflow).not.toContain('RISCK_COMPLY_ENTERPRISE_RELEASE=true');
  });

  it('still fails closed on code quality, critical public security and billing readiness', () => {
    for (const token of [
      'npm ci',
      'npm run lint',
      'npm run typecheck',
      'npm run test',
      'npm run build',
      'check-public-production-release-env.mjs',
      'security:api-guards',
      'security:auth-tokens',
      'security:authorization-bola',
      'security:server-action-identity',
      'security:protected-routes',
      'security:origin-guards',
      'security:billing-webhook-body',
      'security:public-secrets',
      'security:public-errors',
      'security:headers',
      'security:no-store',
      'security:storage',
      'quality:routes',
    ]) {
      expect(workflow).toContain(token);
    }
  });

  it('resolves rollback automatically from a previous healthy production deployment', () => {
    expect(workflow).toContain('RELEASE_ROLLBACK_RESOLUTION_MODE: automatic');
    expect(workflow).toContain('Resolve and validate previous healthy production rollback');
    expect(workflow).toContain('node scripts/release/resolve-public-production-rollback.mjs');
    expect(workflow).toContain('public-ga-rollback-resolution.json');
    expect(workflow).not.toContain('vars.RELEASE_ROLLBACK_TARGET_URL');
    expect(workflow).not.toContain("secrets['RELEASE_ROLLBACK_TARGET_URL']");
    expect(workflow).not.toContain('vars.LAST_KNOWN_GOOD_DEPLOYMENT_URL');

    expect(rollbackResolver).toContain("api.searchParams.set('target', 'production')");
    expect(rollbackResolver).toContain("if (state !== 'READY') continue");
    expect(rollbackResolver).toContain("if (sha === releaseSha) continue");
    expect(rollbackResolver).toContain("/api/health");
    expect(rollbackResolver).toContain("const VERCEL_CLI_VERSION = '56.3.2'");
    expect(rollbackResolver).toContain("'curl'");
    expect(rollbackResolver).toContain("'/api/health'");
    expect(rollbackResolver).toContain("'--deployment'");
    expect(rollbackResolver).toContain("'--token'");
    expect(rollbackResolver).toContain('healthIsReadyViaVercelCurl');
    expect(rollbackResolver).toContain("selectedRollbackIdentifiersStored: false");
    expect(rollbackResolver).not.toContain('GITHUB_ENV');
    expect(rollbackResolver).not.toContain('RELEASE_ROLLBACK_TARGET_URL: selected');
    expect(rollbackResolver).toContain("throw new Error('healthy_rollback_target_missing')");
  });

  it('preserves Beagle evidence before the fallible rollback gate and uploads rollback evidence on failure', () => {
    const preserveIndex = workflow.indexOf('Preserve Beagle pre-change release boundary');
    const resolverIndex = workflow.indexOf('Resolve and validate previous healthy production rollback');
    const smokeIndex = workflow.indexOf('Production smoke on canonical hostname');

    expect(preserveIndex).toBeGreaterThan(-1);
    expect(resolverIndex).toBeGreaterThan(preserveIndex);
    expect(smokeIndex).toBeGreaterThan(resolverIndex);
    expect(workflow).toMatch(/Upload Public GA rollback resolution evidence\n\s+if: always\(\)/);
    expect(workflow).toContain("RELEASE_ROLLBACK_TARGET_VALIDATED: 'true'");
  });

  it('uses explicit Vercel project/team binding and observes the native exact-SHA production deployment', () => {
    expect(workflow).toContain('VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}');
    expect(workflow).toContain('VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}');
    expect(workflow).toContain('https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID?teamId=$VERCEL_ORG_ID');
    expect(workflow).toContain('https://api.vercel.com/v7/deployments?projectId=$VERCEL_PROJECT_ID&teamId=$VERCEL_ORG_ID&target=production&sha=');
    expect(workflow).toContain('Wait for exact-SHA Vercel production deployment');
    expect(workflow).toContain('Verify exact deployment identity');
    expect(workflow).toContain('https://api.vercel.com/v13/deployments/$VERCEL_DEPLOYMENT_ID?teamId=$VERCEL_ORG_ID');
    expect(workflow).toContain('test "$observed_target" = "production"');
    expect(workflow).toContain('test "$state" = "READY"');
    expect(workflow).not.toContain('vercel@${VERCEL_CLI_VERSION}');
    expect(workflow).not.toContain('vercel pull');
    expect(workflow).not.toContain('vercel deploy');
    expect(workflow).not.toContain('--scope=');
    expect(workflow).not.toContain('--project=');
  });

  it('binds deployment verification to exact current main before observation and after promotion', () => {
    expect(workflow.match(/git rev-parse origin\/main/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(workflow).toContain('verify-runtime-release-sha.mjs');
    expect(workflow).toContain('RELEASE_COMMIT_SHA: ${{ inputs.release_sha }}');
    expect(workflow).toContain('RELEASE_BUILD_SHA: ${{ inputs.release_sha }}');
    expect(workflow).toContain('https://www.risckcomply.com');
    expect(workflow).toContain('RELEASE_SMOKE_URLS: https://www.risckcomply.com');
    expect(workflow).not.toContain('RELEASE_SMOKE_URLS: ${{ steps.deploy.outputs.url }}');
  });

  it('preserves the existing strict Enterprise deployment workflow independently', () => {
    expect(enterpriseWorkflow).toContain('Hydrate exact-SHA audit-chain runtime evidence');
    expect(enterpriseWorkflow).toContain('Hydrate exact-SHA Supabase RLS runtime evidence');
    expect(enterpriseWorkflow).toContain('Run pre-deployment release authorization gates');
  });

  it('does not use fake-green mechanisms', () => {
    expect(workflow).not.toMatch(/continue-on-error:\s*true/);
    expect(workflow).not.toContain('|| true');
    expect(workflow).not.toContain('exit 0 #');
    expect(rollbackResolver).not.toContain('|| true');
    expect(rollbackResolver).not.toContain('shell: true');
    expect(rollbackResolver).not.toContain("'deploy'");
    expect(rollbackResolver).not.toContain("'pull'");
    expect(rollbackResolver).not.toContain("'promote'");
  });
});
