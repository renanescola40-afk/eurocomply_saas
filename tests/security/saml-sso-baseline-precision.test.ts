import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const runtime = readFileSync('scripts/identity/run-saml-sso-runtime-proof.mjs', 'utf8');

describe('SAML SSO audit baseline precision', () => {
  it('keeps the raw Postgres timestamp as the exclusive boundary', () => {
    expect(runtime).toContain('function exactTimestampBoundary(value, fallback)');
    expect(runtime).toContain('return raw;');
    expect(runtime).toContain('exactTimestampBoundary(baseline?.created_at, proofStartedAt.toISOString())');
    expect(runtime).not.toContain('function laterIso');
    expect(runtime).not.toContain('new Date(Math.max');
  });
});
