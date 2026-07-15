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

  it('isolates network configuration from the evidence writer', () => {
    const probe = read('scripts/security/probe-google-oauth-provider.mjs');
    const writer = read('scripts/security/run-google-oauth-provider-validation.mjs');

    expect(probe).toContain('/config/auth');
    expect(probe).toContain('external_google_enabled');
    expect(probe).toContain('uri_allow_list');
    expect(probe).not.toContain('writeFile');
    expect(probe).not.toContain('google-oauth-validation.json');

    expect(writer).toContain("spawnSync(process.execPath, [PROBE]");
    expect(writer).not.toContain('fetch(');
    expect(writer).not.toContain('/config/auth');
    expect(writer).not.toContain('external_google_enabled');
    expect(writer).not.toContain('uri_allow_list');
    expect(writer).toContain('managementTokenStored: false');
    expect(writer).toContain('projectReferenceStored: false');
    expect(writer).toContain('rawProviderConfigStored: false');
    expect(writer).toContain('rawRedirectAllowlistStored: false');
    expect(writer).toContain('siteUrlStored: false');
    expect(writer).toContain('providerHostnameStored: false');
    expect(writer).toContain('remoteErrorStored: false');
    expect(writer).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('requires numeric provenance and an exact same-origin HTTPS callback', () => {
    const writer = read('scripts/security/run-google-oauth-provider-validation.mjs');
    const probe = read('scripts/security/probe-google-oauth-provider.mjs');

    expect(writer).toContain("if (!/^\\d+$/.test(githubRunId)) failures.push('invalid_github_run_id')");
    expect(probe).toContain("url.protocol !== 'https:'");
    expect(probe).toContain('url.username || url.password');
    expect(probe).toContain("callback.pathname === '/auth/callback'");
    expect(probe).toContain('callback.origin === siteUrl.origin');
    expect(probe).toContain("callback.search === ''");
    expect(probe).toContain("callback.hash === ''");
    expect(probe).not.toContain("value.includes('/auth/callback')");
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
