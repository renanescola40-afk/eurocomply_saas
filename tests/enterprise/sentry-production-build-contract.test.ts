import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const nextConfig = readFileSync('next.config.ts', 'utf8');
const providerProof = readFileSync('scripts/security/run-production-provider-runtime-proof.mjs', 'utf8');

describe('Sentry production build contract', () => {
  it('normalizes protected Sentry build configuration before passing it to the SDK', () => {
    expect(nextConfig).toContain("const sentryOrg = process.env.SENTRY_ORG?.trim();");
    expect(nextConfig).toContain("const sentryProject = process.env.SENTRY_PROJECT?.trim();");
    expect(nextConfig).toContain("const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();");
    expect(nextConfig).toContain('sentryOrg && sentryProject && sentryAuthToken');
    expect(nextConfig).toContain('authToken: sentryAuthToken');
  });

  it('uses the current Sentry webpack treeshake option instead of deprecated disableLogger', () => {
    expect(nextConfig).toContain('webpack: {');
    expect(nextConfig).toContain('treeshake: {');
    expect(nextConfig).toContain('removeDebugLogging: true');
    expect(nextConfig).not.toContain('disableLogger: true');
  });

  it('keeps runtime instrumentation enabled when release-upload credentials are absent', () => {
    expect(nextConfig).toContain('export default withSentryConfig(nextIntlConfig');
    expect(nextConfig).toContain("tunnelRoute: '/monitoring'");
    expect(nextConfig).toContain(': {};');
  });

  it('requires the Sentry build token in the Vercel production environment inventory', () => {
    const requiredKeysSection = providerProof.slice(
      providerProof.indexOf('const REQUIRED_VERCEL_KEYS'),
      providerProof.indexOf('function env(name)'),
    );

    expect(requiredKeysSection).toContain("'SENTRY_AUTH_TOKEN'");
  });
});
