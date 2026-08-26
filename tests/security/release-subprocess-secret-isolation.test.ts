import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const helper = readFileSync('scripts/release/release-subprocess-env.mjs', 'utf8');
const publicRunner = readFileSync('scripts/release/run-public-production-release-final.mjs', 'utf8');
const enterpriseRunner = readFileSync('scripts/release/run-public-production-release-v2.mjs', 'utf8');
const dispatcher = readFileSync('scripts/release/run-public-production-release.mjs', 'utf8');

const protectedKeys = [
  'HEALTHCHECK_TOKEN',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'UPSTASH_REDIS_REST_TOKEN',
  'SENTRY_AUTH_TOKEN',
  'SENTRY_DSN',
  'STEP_UP_SIGNING_SECRET',
  'STEP_UP_ASSERTION_SIGNING_SECRET',
  'AUDIT_CHAIN_SIGNING_SECRET',
];

describe('release subprocess secret isolation', () => {
  it('centralizes protected environment stripping and requires explicit allowlisting', () => {
    expect(helper).toContain('stripProtectedReleaseEnv');
    expect(helper).toContain('buildReleaseSubprocessEnv');
    expect(helper).toContain('attempted to allow unknown protected key');
    for (const key of protectedKeys) expect(helper).toContain(`'${key}'`);
  });

  it('does not expose provider secrets to public install or static validation children', () => {
    expect(publicRunner).toContain("['00-npm-ci', 'npm ci --ignore-scripts', 'npm', ['ci', '--ignore-scripts']]");
    expect(publicRunner).toContain('buildReleaseSubprocessEnv(process.env, protectedKeysByStep.get(step.slug) || [])');
    expect(publicRunner).toContain("['08-security-rls-live', ['SUPABASE_SERVICE_ROLE_KEY']]");
    expect(publicRunner).toContain("['09-release-deployment-smoke', ['HEALTHCHECK_TOKEN']]");
    expect(publicRunner).toContain("['10-release-observability-smoke', ['HEALTHCHECK_TOKEN']]");
    expect(publicRunner).toContain("['11-release-rollback-dry-run', ['HEALTHCHECK_TOKEN']]");
    expect(publicRunner).not.toContain("['04-build-for-production-like-e2e', ['STRIPE_SECRET_KEY']]");
    expect(publicRunner).not.toContain("['07-security-ci', ['SUPABASE_SERVICE_ROLE_KEY']]");
  });

  it('allows only the readiness token into enterprise live smoke subprocesses', () => {
    expect(enterpriseRunner).toContain("import { buildReleaseSubprocessEnv } from './release-subprocess-env.mjs';");
    expect(enterpriseRunner).toContain('buildReleaseSubprocessEnv(process.env, protectedKeysByStep.get(step.slug) || [])');
    expect(enterpriseRunner).toContain("['09-release-deployment-smoke', ['HEALTHCHECK_TOKEN']]");
    expect(enterpriseRunner).toContain("['10-release-observability-smoke', ['HEALTHCHECK_TOKEN']]");
    expect(enterpriseRunner).toContain("['11-release-rollback-dry-run', ['HEALTHCHECK_TOKEN']]");
    expect(enterpriseRunner).not.toContain("['09-release-deployment-smoke', ['SUPABASE_SERVICE_ROLE_KEY']]");
    expect(enterpriseRunner).not.toContain("['10-release-observability-smoke', ['STRIPE_SECRET_KEY']]");
    expect(enterpriseRunner).not.toContain("['11-release-rollback-dry-run', ['SENTRY_AUTH_TOKEN']]");
    expect(enterpriseRunner).toContain("env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';");
  });

  it('scrubs enterprise provider configuration while retaining only readiness authority in the parent', () => {
    expect(dispatcher).toContain("await import('./check-enterprise-release-env.mjs');");
    expect(dispatcher).toMatch(/const readinessToken = process\.env\.HEALTHCHECK_TOKEN;[\s\S]*stripProtectedReleaseEnv\(process\.env\);[\s\S]*process\.env\.HEALTHCHECK_TOKEN = readinessToken;[\s\S]*run-public-production-release-v2\.mjs/);
    expect(dispatcher).toContain('env: buildReleaseSubprocessEnv({ ...process.env, ...envOverrides }, allowProtectedKeys)');
    expect(dispatcher).not.toMatch(/process\.env\.SUPABASE_SERVICE_ROLE_KEY\s*=/);
    expect(dispatcher).not.toMatch(/process\.env\.STRIPE_SECRET_KEY\s*=/);
    expect(dispatcher).not.toMatch(/process\.env\.SENTRY_AUTH_TOKEN\s*=/);
  });

  it('scrubs public protected configuration before post-run evidence subprocesses', () => {
    expect(dispatcher).toMatch(/run-public-production-release-final\.mjs'\);[\s\S]*stripProtectedReleaseEnv\(process\.env\);[\s\S]*write-public-production-go-no-go-evidence\.mjs/);
  });

  it('restores only the readiness token for the live runtime SHA verifier', () => {
    expect(dispatcher).toMatch(/verify-runtime-release-sha\.mjs'[\s\S]*\['HEALTHCHECK_TOKEN'\]/);
    expect(dispatcher).not.toMatch(/verify-runtime-release-sha\.mjs'[\s\S]*\['SUPABASE_SERVICE_ROLE_KEY'\]/);
    expect(dispatcher).not.toMatch(/verify-runtime-release-sha\.mjs'[\s\S]*\['STRIPE_SECRET_KEY'\]/);
  });
});