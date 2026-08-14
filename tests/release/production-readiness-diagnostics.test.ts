import { describe, expect, it } from 'vitest';

import { buildSafeReadinessDiagnostics } from '../../scripts/release/production-readiness-diagnostics.mjs';

describe('production readiness diagnostic redaction', () => {
  it('retains only fixed labels, booleans and counts from the protected readiness payload', () => {
    const diagnostics = buildSafeReadinessDiagnostics({
      status: 'customer-secret-status',
      environment: [
        { name: 'supabase', configured: true, missingCount: 0 },
        { name: 'SECRET_API_KEY', configured: true, missingCount: 0 },
      ],
      database: {
        adminClient: true,
        subscriptionsReadable: false,
        detail: 'postgres://user:password@example.invalid/database',
      },
      stripe: {
        configured: true,
        apiReachable: false,
        priceLookup: false,
        pricesChecked: 2,
        detail: 'sk_live_private_value',
      },
      sentryReleaseUploads: {
        configured: false,
        missingCount: 1,
        sourceMapsUploadRequiresAuthToken: true,
      },
      enterpriseStepUp: {
        required: true,
        configured: false,
        dedicatedSigningSecretConfigured: false,
        runtimeConfigurationConfigured: true,
      },
      enterpriseStorageScanner: {
        required: true,
        configured: false,
        storageBucketConfigured: true,
        malwareScanningRequired: true,
        realScannerProviderConfigured: false,
        scannerTransportConfigured: false,
      },
      checks: {
        supabaseConfigured: true,
        stripeApiReachable: false,
        SECRET_TOKEN: true,
        customerDerivedFlag: false,
      },
    });

    expect(diagnostics.status).toBe('unknown');
    expect(diagnostics.environment).toEqual([
      { name: 'supabase', configured: true, missingCount: 0 },
    ]);
    expect(diagnostics.database.detail).toBe('unknown');
    expect(diagnostics.stripe.detail).toBe('unknown');
    expect(diagnostics.checks).toEqual({
      supabaseConfigured: true,
      stripeApiReachable: false,
    });

    const serialized = JSON.stringify(diagnostics);
    for (const forbidden of [
      'customer-secret-status',
      'SECRET_API_KEY',
      'postgres://',
      'password',
      'sk_live_private_value',
      'SECRET_TOKEN',
      'customerDerivedFlag',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('preserves only documented runtime labels when they are valid', () => {
    const diagnostics = buildSafeReadinessDiagnostics({
      status: 'not_ready',
      environment: [{ name: 'stripe', configured: false, missingCount: 2 }],
      database: { adminClient: true, subscriptionsReadable: true, detail: 'ok' },
      stripe: { configured: false, apiReachable: false, priceLookup: false, pricesChecked: 0, detail: 'not_configured' },
      checks: { healthcheckProtected: true },
    });

    expect(diagnostics.status).toBe('not_ready');
    expect(diagnostics.environment[0]?.name).toBe('stripe');
    expect(diagnostics.database.detail).toBe('ok');
    expect(diagnostics.stripe.detail).toBe('not_configured');
    expect(diagnostics.checks).toEqual({ healthcheckProtected: true });
  });

  it('returns a fixed unavailable marker for non-object bodies', () => {
    expect(buildSafeReadinessDiagnostics(null)).toEqual({ responseAvailable: false });
    expect(buildSafeReadinessDiagnostics('secret')).toEqual({ responseAvailable: false });
  });
});
