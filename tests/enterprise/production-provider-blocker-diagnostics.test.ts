import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildProviderBlockerDiagnostics,
  deriveProviderBlockerCodes,
  deriveSentryProbeBlockerCode,
  httpDiagnostic,
} from '../../scripts/security/diagnose-production-provider-blockers.mjs';

const sha = 'b'.repeat(40);
const source = readFileSync('scripts/security/diagnose-production-provider-blockers.mjs', 'utf8');

describe('production provider blocker diagnostics', () => {
  it('classifies HTTP failures without response bodies or request URLs', () => {
    expect(httpDiagnostic(401)).toEqual({ httpStatus: 401, category: 'unauthenticated' });
    expect(httpDiagnostic(403)).toEqual({ httpStatus: 403, category: 'forbidden_or_insufficient_scope' });
    expect(httpDiagnostic(404)).toEqual({ httpStatus: 404, category: 'resource_not_found' });
    expect(httpDiagnostic(429)).toEqual({ httpStatus: 429, category: 'rate_limited' });
    expect(httpDiagnostic(503)).toEqual({ httpStatus: 503, category: 'provider_server_error' });
    expect(httpDiagnostic(null)).toEqual({ httpStatus: null, category: 'network_or_unknown' });
  });

  it('suppresses dependent Vercel symptoms when the API token prerequisite is missing', () => {
    expect(deriveProviderBlockerCodes({
      provider: 'vercel',
      status: 'blocked',
      checks: {
        apiTokenConfigured: false,
        targetConfigurationBound: true,
        projectReachable: false,
        projectIdentityMatched: false,
        productionEnvironmentEnumerated: false,
        requiredEnvironmentKeysPresent: false,
      },
    })).toEqual([
      'vercel_api_token_missing',
    ]);
  });

  it('reports independent Vercel prerequisite failures without downstream noise', () => {
    expect(deriveProviderBlockerCodes({
      provider: 'vercel',
      status: 'blocked',
      checks: {
        apiTokenConfigured: false,
        targetConfigurationBound: false,
        projectReachable: false,
        projectIdentityMatched: false,
      },
    })).toEqual([
      'vercel_api_token_missing',
      'vercel_target_configuration_invalid',
    ]);
  });

  it('turns Sentry diagnostic HTTP categories into one actionable root-cause code', () => {
    const entry = {
      provider: 'sentry',
      status: 'blocked',
      checks: {
        organizationConfigured: true,
        projectConfigured: true,
        buildAuthTokenConfigured: true,
        projectReachable: false,
        clientKeyInventoryReachable: false,
        activeClientKeyPresent: false,
      },
    };
    const forbiddenProbe = {
      attempted: true,
      projectProbe: { httpStatus: 403, category: 'forbidden_or_insufficient_scope' },
      clientKeysProbe: { httpStatus: 403, category: 'forbidden_or_insufficient_scope' },
    };

    expect(deriveSentryProbeBlockerCode(forbiddenProbe)).toBe('sentry_auth_token_insufficient_scope');
    expect(deriveProviderBlockerCodes(entry, forbiddenProbe)).toEqual([
      'sentry_auth_token_insufficient_scope',
    ]);
  });

  it('keeps generic Sentry blocked checks when no secondary probe classification exists', () => {
    expect(deriveProviderBlockerCodes({
      provider: 'sentry',
      status: 'blocked',
      checks: {
        organizationConfigured: true,
        projectConfigured: true,
        buildAuthTokenConfigured: true,
        projectReachable: false,
        clientKeyInventoryReachable: false,
        activeClientKeyPresent: false,
      },
    })).toEqual([
      'sentry_project_api_unreachable',
      'sentry_client_key_inventory_unavailable',
      'sentry_active_client_key_missing',
    ]);
  });

  it('keeps file-derived Vercel identity out of outbound diagnostic requests', () => {
    expect(source).not.toContain('async function probe(url');
    expect(source).toContain("secondaryNetworkProbeScope: 'sentry-only-fixed-origin'");
    expect(source).toContain('fileDerivedOutboundTargetsUsed: false');
    expect(source).toContain('canonical_provider_proof_is_authoritative');
    expect(source).toContain('https://sentry.io/api/0/projects/');
    expect(source).not.toContain('fetch(`https://api.vercel.com');
  });

  it('keeps diagnostics separate from provider PASS semantics', async () => {
    const evidence = {
      status: 'Open',
      outcome: 'blocked',
      runtimeContext: { commitSha: sha },
      providersReviewed: [
        { provider: 'github', status: 'reviewed', checks: { exactContext: true } },
        {
          provider: 'vercel',
          status: 'blocked',
          checks: { apiTokenConfigured: false, targetConfigurationBound: true },
          metrics: { requiredEnvironmentKeys: 15, requiredEnvironmentKeysPresent: 0 },
        },
      ],
    };

    const diagnostics = await buildProviderBlockerDiagnostics(evidence);
    expect(diagnostics.status).toBe('Complete');
    expect(diagnostics.providerProofStatus).toBe('Open');
    expect(diagnostics.providerProofOutcome).toBe('blocked');
    expect(diagnostics.operatorActionRequired).toBe(true);
    expect(diagnostics.targetSha).toBe(sha);
    expect(diagnostics.blockerCodes).toEqual(['vercel_api_token_missing']);
    expect(diagnostics.evidenceIntegrity).toMatchObject({
      containsSensitiveValues: false,
      credentialsStored: false,
      requestUrlsStored: false,
      providerResponseBodiesStored: false,
      fileDerivedOutboundTargetsUsed: false,
    });
  });

  it('does not emit blockers for reviewed providers', () => {
    expect(deriveProviderBlockerCodes({
      provider: 'stripe',
      status: 'reviewed',
      checks: { apiReachable: true },
    })).toEqual([]);
  });
});
