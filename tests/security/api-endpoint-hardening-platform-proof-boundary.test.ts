import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const protectedPlatformProofRoutes = [
  'src/app/api/internal/platform-proof/email/route.ts',
  'src/app/api/internal/platform-proof/rate-limit/route.ts',
  'src/app/api/internal/platform-proof/sentry/route.ts',
  'src/app/api/internal/platform-proof/stripe-checkout/route.ts',
  'src/app/api/internal/platform-proof/stripe-subscriptions/route.ts',
];

describe('API endpoint hardening trusted platform-proof boundary', () => {
  it('only credits the canonical helper when the route consumes it fail closed', () => {
    const scanner = read('scripts/security/check-api-endpoint-hardening.mjs');

    expect(scanner).toContain('const platformProofImportPattern =');
    expect(scanner).toContain('function hasTrustedPlatformProofBoundary(source)');
    expect(scanner).toContain('platformProofImportPattern.test(source)');
    expect(scanner).toContain('await\\s+authorizePlatformProofRequest');
    expect(scanner).toContain('failClosedPattern');
    expect(scanner).toContain('const trustedPlatformProofBoundary = hasTrustedPlatformProofBoundary(source)');
    expect(scanner).toContain('const authenticated = hasAny(source, authTokens) || trustedPlatformProofBoundary');
    expect(scanner).toContain('const rateLimited = hasAny(source, rateLimitTokens) || trustedPlatformProofBoundary');
  });

  it.each(protectedPlatformProofRoutes)('%s imports and consumes the canonical boundary fail closed', (path) => {
    const route = read(path);

    expect(route).toContain("import { authorizePlatformProofRequest } from '@/server/security/platform-proof'");
    expect(route).toMatch(/const\s+authorization\s*=\s*await\s+authorizePlatformProofRequest\s*\(\s*request\s*,/);
    expect(route).toMatch(/if\s*\(\s*!authorization\.ok\s*\)\s*return\s+authorization\.response\s*;/);
  });
});
