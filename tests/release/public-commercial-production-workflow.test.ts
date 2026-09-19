import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/public-commercial-production.yml', 'utf8');
const enterpriseWorkflow = readFileSync('.github/workflows/vercel-production.yml', 'utf8');

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

  it('uses explicit Vercel project/team binding and a prebuilt production deploy', () => {
    expect(workflow).toContain('rm -rf .vercel');
    expect(workflow).toContain('.vercel/project.json');
    expect(workflow).toContain('--project="$VERCEL_PROJECT_ID"');
    expect(workflow).toContain('--scope="$VERCEL_ORG_ID"');
    expect(workflow).toContain('--token="$VERCEL_TOKEN"');
    expect(workflow).toContain('vercel@${VERCEL_CLI_VERSION}" pull');
    expect(workflow).toContain('vercel@${VERCEL_CLI_VERSION}" build --prod');
    expect(workflow).toContain('--prebuilt');
    expect(workflow).toContain('--prod');
  });

  it('binds deployment to exact current main before build, deploy and after promotion', () => {
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
  });
});
