import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('Google OAuth provider proof contract', () => {
  it('uses a protected read-only exact-SHA workflow', () => {
    const workflow = read('.github/workflows/google-oauth-provider-proof.yml');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('ref: ${{ inputs.release_sha }}');
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "${RELEASE_SHA,,}"');
    expect(workflow).not.toContain('pull_request_target');
  });

  it('reads provider configuration without persisting credentials or raw configuration', () => {
    const script = read('scripts/security/run-google-oauth-provider-validation.mjs');
    expect(script).toContain('/config/auth');
    expect(script).toContain('external_google_enabled');
    expect(script).toContain('uri_allow_list');
    expect(script).toContain('managementTokenStored: false');
    expect(script).toContain('projectReferenceStored: false');
    expect(script).toContain('rawProviderConfigStored: false');
    expect(script).toContain('rawRedirectAllowlistStored: false');
    expect(script).toContain('siteUrlStored: false');
    expect(script).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('requires numeric provenance and an exact same-origin HTTPS callback', () => {
    const script = read('scripts/security/run-google-oauth-provider-validation.mjs');
    expect(script).toContain("if (!/^\\d+$/.test(githubRunId)) failures.push('invalid_github_run_id')");
    expect(script).toContain("url.protocol !== 'https:'");
    expect(script).toContain('url.username || url.password');
    expect(script).toContain("callback.pathname === '/auth/callback'");
    expect(script).toContain('callback.origin === siteUrl.origin');
    expect(script).toContain("callback.search === ''");
    expect(script).toContain("callback.hash === ''");
    expect(script).not.toContain("value.includes('/auth/callback')");
  });

  it('keeps committed evidence blocked until protected runtime execution succeeds', () => {
    const evidence = JSON.parse(read('docs/security/evidence/runtime/google-oauth-validation.json')) as {
      status: string;
      outcome: string;
      controlsVerified?: string[];
      evidenceIntegrity?: { placeholderOnly?: boolean };
      productionGate?: string;
    };
    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('not_run');
    expect(evidence.controlsVerified ?? []).toHaveLength(0);
    expect(evidence.evidenceIntegrity?.placeholderOnly).toBe(true);
    expect(evidence.productionGate?.toLowerCase()).toContain('blocked');
  });
});
