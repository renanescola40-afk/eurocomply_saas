import { describe, expect, it } from 'vitest';
import {
  auditChainRuntimePreflight,
  blockedAuditChainEvidence,
} from '../../scripts/security/preflight-audit-chain-runtime-proof.mjs';

const sha = 'a'.repeat(40);

describe('audit-chain runtime prerequisite preflight', () => {
  it('allows live execution only when every protected prerequisite is present', () => {
    const result = auditChainRuntimePreflight({
      targetSha: sha,
      supabaseUrl: 'https://example.supabase.co',
      serviceRoleKey: 'configured',
      auditSigningSecret: 'configured',
      evidencePackSigningSecret: 'configured',
    });

    expect(result.ready).toBe(true);
    expect(result.blockerCodes).toEqual([]);
    expect(Object.values(result.checks).every(Boolean)).toBe(true);
  });

  it('fails closed before runtime mutation when signing secrets are missing', () => {
    const result = auditChainRuntimePreflight({
      targetSha: sha,
      supabaseUrl: 'https://example.supabase.co',
      serviceRoleKey: 'configured',
      auditSigningSecret: '',
      evidencePackSigningSecret: '',
    });

    expect(result.ready).toBe(false);
    expect(result.blockerCodes).toEqual([
      'audit_chain_signing_secret_missing',
      'evidence_pack_signing_secret_missing',
    ]);

    const evidence = blockedAuditChainEvidence(result, '2026-08-11T00:00:00.000Z');
    expect(evidence.status).toBe('Open');
    expect(evidence.outcome).toBe('blocked');
    expect(evidence.releaseGate).toMatchObject({ blocked: true });
    expect(evidence.liveValidation).toMatchObject({
      status: 'NotRun',
      ephemeralFixturesCreated: false,
    });
    expect(evidence.evidenceIntegrity).toMatchObject({
      containsSensitiveValues: false,
      credentialsStored: false,
      disposableRuntimeMutationPerformed: false,
    });
  });

  it('rejects malformed target SHA rather than creating ambiguous evidence', () => {
    const result = auditChainRuntimePreflight({
      targetSha: 'main',
      supabaseUrl: 'configured',
      serviceRoleKey: 'configured',
      auditSigningSecret: 'configured',
      evidencePackSigningSecret: 'configured',
    });

    expect(result.ready).toBe(false);
    expect(result.blockerCodes).toContain('target_sha_invalid');
  });

  it('never records prerequisite values in blocked evidence', () => {
    const result = auditChainRuntimePreflight({
      targetSha: sha,
      supabaseUrl: 'https://secret-looking.example',
      serviceRoleKey: 'service-role-secret-value',
      auditSigningSecret: '',
      evidencePackSigningSecret: '',
    });
    const serialized = JSON.stringify(blockedAuditChainEvidence(result));

    expect(serialized).not.toContain('service-role-secret-value');
    expect(serialized).not.toContain('secret-looking.example');
  });
});
