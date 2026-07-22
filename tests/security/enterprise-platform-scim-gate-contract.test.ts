import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const checker = readFileSync('scripts/security/check-enterprise-api-security.mjs', 'utf8');

describe('enterprise platform and SCIM security gate contracts', () => {
  it('requires explicit platform-admin authority instead of tenant-member RBAC', () => {
    expect(checker).toContain('function evaluatePlatformAdminContract');
    expect(checker).toContain("'requireApiUser'");
    expect(checker).toContain("'requirePlatformCapability'");
    expect(checker).toContain("'requireTrustedMutation'");
    expect(checker).toContain("failureMode: 'fail-closed'");
  });

  it('requires bearer-bound SCIM authority and bounded mutable payloads', () => {
    expect(checker).toContain('function evaluateScimUserContract');
    expect(checker).toContain("'authenticateScimRequest'");
    expect(checker).toContain("'checkDistributedRateLimit'");
    expect(checker).toContain("'readBoundedJsonRequest'");
  });
});
