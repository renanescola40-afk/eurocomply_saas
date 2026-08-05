import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/saml-sso-runtime-proof.yml', 'utf8');
const runtime = readFileSync('scripts/identity/run-saml-sso-runtime-proof.mjs', 'utf8');
const validator = readFileSync('scripts/identity/check-saml-sso-runtime-evidence.mjs', 'utf8');
const laneContracts = readFileSync('scripts/enterprise/runtime-lane-contracts.mjs', 'utf8');
const manifest = readFileSync('docs/security/evidence/enterprise-runtime-campaign-manifest.json', 'utf8');

describe('SAML SSO runtime proof megapack', () => {
  it('uses protected exact-main execution and immutable redacted evidence', () => {
    expect(workflow).toContain('name: SAML SSO Runtime Proof');
    expect(workflow).toContain('environment: production-identity-proof');
    expect(workflow).toContain('EXECUTE_SAML_SSO_RUNTIME_PROOF');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('test "$GITHUB_SHA" = "$TARGET_SHA"');
    expect(workflow).toContain('retention-days: 365');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('\nrun-name:');
  });

  it('requires a new audit event rather than accepting historical login state', () => {
    for (const token of [
      'proofStartedAt',
      'baselineCaptured',
      'created_at=gt.',
      'new_saml_login_not_observed',
      'newSamlLoginObserved',
      'enterprise.sso_login',
      'entity_type=eq.enterprise_identity_connection',
      'provisioningOutcomeAccepted',
      'connectionLastLoginAdvanced',
    ]) {
      expect(runtime).toContain(token);
    }
  });

  it('binds the live login to the exact deployed release and active entitlement', () => {
    for (const token of [
      '/api/ready/release',
      'evaluateRuntimeReleaseSha',
      'runtimeReleaseNoStore',
      'runtimeReleaseShaMatched',
      "connection.protocol === 'saml'",
      "connection.status === 'active'",
      'verifiedDomainConfigured',
      'providerBindingConfigured',
      'resolve_organization_entitlements_v3',
      'ssoEntitlementActive',
      'postLoginEntitlementActive',
    ]) {
      expect(runtime).toContain(token);
    }
  });

  it('retains no assertion, identity, tenant, provider or credential values', () => {
    for (const token of [
      "schema: 'risck-comply.saml-sso-runtime-evidence.v1'",
      "controlsVerified: passed ? ['IAM-09'] : []",
      'containsSensitiveValues: false',
      'serviceRoleStored: false',
      'healthTokenStored: false',
      'emailStored: false',
      'assertionStored: false',
      'identityIdentifiersStored: false',
      'organizationIdentifiersStored: false',
      'providerIdentifiersStored: false',
      'auditPayloadStored: false',
      'networkHeadersStored: false',
      'eventTimestampStored: false',
    ]) {
      expect(runtime).toContain(token);
    }
    const evidenceAssembly = runtime.slice(runtime.indexOf('const evidence ='));
    expect(evidenceAssembly).not.toContain('connectionId,');
    expect(evidenceAssembly).not.toContain('organizationId,');
    expect(evidenceAssembly).not.toContain('observedEvent,');
    expect(evidenceAssembly).not.toContain('metadata,');
  });

  it('validates every proof check and rejects raw UUIDs or protocol secrets', () => {
    for (const token of [
      'newSamlLoginObserved',
      'auditProviderMatched',
      'runtimeObservedSha !== evidence.targetSha',
      'newEventRequired !== true',
      'SAML evidence contains a raw UUID',
      'provider_id',
      'samlresponse',
    ]) {
      expect(validator).toContain(token);
    }
  });

  it('adds SAML SSO as a mandatory exact-SHA runtime campaign lane', () => {
    expect(laneContracts).toContain("'IAM-SAML'");
    expect(laneContracts).toContain("workflow: 'saml-sso-runtime-proof.yml'");
    expect(laneContracts).toContain("artifactPrefix: 'saml-sso-runtime-proof-'");
    expect(laneContracts).toContain("requiredEvidenceFiles: Object.freeze(['saml-sso-runtime-validation.json'])");
    expect(manifest).toContain('"id":"IAM-SAML"');
    expect(manifest).toContain('"workflow":"saml-sso-runtime-proof.yml"');
  });
});
