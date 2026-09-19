import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  join(process.cwd(), '.github/workflows/vercel-production.yml'),
  'utf8',
);
const rollbackDryRun = readFileSync(
  join(process.cwd(), 'scripts/release/run-rollback-dry-run.mjs'),
  'utf8',
);

describe('Vercel Trusted Sources rollback authentication', () => {
  it('grants only the GitHub OIDC permission required for short-lived trusted-source access', () => {
    expect(workflow).toContain('permissions:');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('id-token: write');
  });

  it('mints and masks a short-lived OIDC token before rollback validation', () => {
    const oidcStep = workflow.indexOf(
      'Mint short-lived GitHub OIDC token for Vercel Trusted Sources',
    );
    const rollbackGate = workflow.indexOf(
      'Run pre-deployment release authorization gates',
    );

    expect(oidcStep).toBeGreaterThan(-1);
    expect(rollbackGate).toBeGreaterThan(oidcStep);

    const section = workflow.slice(oidcStep, rollbackGate);
    expect(section).toContain('ACTIONS_ID_TOKEN_REQUEST_URL');
    expect(section).toContain('ACTIONS_ID_TOKEN_REQUEST_TOKEN');
    expect(section).toContain('::add-mask::$trusted_oidc_token');
    expect(section).toContain('VERCEL_TRUSTED_OIDC_TOKEN=');
  });

  it('prefers an automation bypass secret when present and otherwise uses GitHub OIDC', () => {
    expect(rollbackDryRun).toContain(
      "'x-vercel-protection-bypass': vercelProtectionBypassSecret",
    );
    expect(rollbackDryRun).toContain(
      "'x-vercel-trusted-oidc-idp-token': vercelTrustedOidcToken",
    );
    expect(rollbackDryRun).toContain(
      "protectionAuthMode: vercelProtectionAuthMode",
    );
  });

  it('does not persist the short-lived OIDC token in retained evidence', () => {
    expect(rollbackDryRun).toContain('trustedOidcTokenStored: false');
    expect(rollbackDryRun).not.toMatch(
      /trustedOidcToken:\s*vercelTrustedOidcToken/,
    );
  });
});
