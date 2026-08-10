import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/production-provider-runtime-proof.yml', 'utf8');
const producer = readFileSync('scripts/security/run-production-provider-runtime-proof.mjs', 'utf8');
const targets = JSON.parse(readFileSync('config/production-provider-targets.json', 'utf8')) as {
  schema: string;
  vercel: { teamId: string; projectId: string; projectName: string };
};

describe('protected production provider runtime proof', () => {
  it('runs on exact main with the protected production environment and read-only permissions', () => {
    expect(workflow).toContain('push:\n    branches: [main]');
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('actions: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).toContain('/commits/main');
    expect(workflow).toContain('test "$main_sha" = "$TARGET_SHA"');
    expect(workflow).toContain('persist-credentials: false');
  });

  it('checks GitHub, Vercel, Supabase, Stripe and Sentry without persisting provider values', () => {
    for (const provider of ['github', 'vercel', 'supabase', 'stripe', 'sentry']) {
      expect(producer).toContain(`providerEntry('${provider}'`);
    }
    expect(producer).toContain('decrypt=false');
    expect(producer).toContain('providerResponseBodiesStored: false');
    expect(producer).toContain('decryptedProviderEnvironmentValuesStored: false');
    expect(producer).toContain('credentialsStored: false');
    expect(producer).toContain('valuesRedacted: true');
    expect(producer).toContain('CANONICAL_REDACTION_CONFIRMATION');
    expect(producer).toContain('No secret values, tokens, URLs, DSNs, cookies, Authorization headers or customer data are stored.');
    expect(producer).not.toContain('console.log(process.env');
  });

  it('binds non-secret Vercel identity to versioned configuration and keeps only its token secret', () => {
    expect(targets).toEqual({
      schema: 'risck-comply.production-provider-targets.v1',
      vercel: {
        teamId: 'team_wu3LZI6ReFxO16xipv73GLwG',
        projectId: 'prj_APpXAyQFy1Gie50xfbO45zjkyUSm',
        projectName: 'eurocomply-saas',
      },
    });
    expect(workflow).toContain('PROVIDER_TARGETS_PATH: config/production-provider-targets.json');
    expect(workflow).toContain('VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}');
    expect(workflow).not.toContain('VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}');
    expect(workflow).not.toContain('VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}');
    expect(producer).toContain('projectIdentityMatched');
    expect(producer).toContain("body?.name === target.projectName");
    expect(producer).toContain("body?.accountId === target.teamId");
  });

  it('verifies Sentry provider-side client-key availability without requiring a DSN copy in GitHub', () => {
    expect(workflow).not.toContain('NEXT_PUBLIC_SENTRY_DSN: ${{ vars.NEXT_PUBLIC_SENTRY_DSN }}');
    expect(workflow).toContain('SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}');
    expect(producer).toContain('/keys/?status=active');
    expect(producer).toContain('clientKeyInventoryReachable');
    expect(producer).toContain('activeClientKeyPresent');
    expect(producer).toContain('DSN and token not stored');
  });

  it('requires the high-impact Vercel production controls that drive readiness', () => {
    for (const key of [
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'HEALTHCHECK_TOKEN',
      'NEXT_PUBLIC_SENTRY_DSN',
      'STEP_UP_SIGNING_SECRET',
      'STEP_UP_PROVIDER_MODE',
      'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
      'MALWARE_SCANNER_PROVIDER',
    ]) {
      expect(producer).toContain(`'${key}'`);
    }
  });

  it('fails closed instead of emitting Complete when any provider is blocked', () => {
    expect(producer).toContain("status: allPassed ? 'Complete' : 'Open'");
    expect(producer).toContain("outcome: allPassed ? 'passed' : 'blocked'");
    expect(producer).toContain('if (!allPassed) process.exitCode = 1');
  });
});
