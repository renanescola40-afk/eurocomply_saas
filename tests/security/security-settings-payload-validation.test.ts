import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/app/api/security/settings/route.ts', 'utf8');

describe('security settings payload validation', () => {
  it('requires an explicit supported step-up provider mode', () => {
    expect(source).toContain("typeof input.stepUpProviderMode !== 'string'");
    expect(source).toContain('!PROVIDER_MODES.has(input.stepUpProviderMode)');
    expect(source).not.toContain("? input.stepUpProviderMode\n      : 'supabase_mfa'");
  });

  it('rejects malformed or oversized IdP claim lists instead of coercing them', () => {
    expect(source).toContain('function isBoundedStringList');
    expect(source).toContain('value.length <= 20');
    expect(source).toContain("typeof entry === 'string'");
    expect(source).toContain('entry.trim().length <= 256');
    expect(source).toContain('invalid_security_settings_payload');
  });

  it('preserves privileged mutation controls and durable audit compensation', () => {
    expect(source).toContain("permission: 'manage_settings'");
    expect(source).toContain("action: 'change_security_settings'");
    expect(source).toContain('requireTrustedMutation(request');
    expect(source).toContain('if (!audit.persisted)');
    expect(source).toContain('security_settings_audit_compensation_failed');
  });
});
