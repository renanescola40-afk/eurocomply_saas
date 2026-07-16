import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('billing entitlements rate-limit gate', () => {
  it('requires the central API guard scanner to recognize and enforce the enterprise rate-limit helper', () => {
    const scanner = fs.readFileSync('scripts/security/check-api-guards.mjs', 'utf8');

    expect(scanner).toContain("'requireEnterpriseRateLimit'");
    expect(scanner).toContain("name: 'billing entitlements'");
    expect(scanner).toContain('/billing\\/entitlements\\/route\\.ts$/');
    expect(scanner).toContain("all: ['billing.entitlements.read']");
  });
});
