import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveTrustedInventoryPatch, executeTrustedInventoryMutation, type TrustedInventorySql, type VerifiedInventoryTransaction } from './trusted-inventory-transaction';

const org = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const actor = '33333333-3333-4333-8333-333333333333';
const session = '44444444-4444-4444-8444-444444444444';
const system = '55555555-5555-4555-8555-555555555555';
const provider = '66666666-6666-4666-8666-666666666666';
const body = { name: 'Synthetic QA system', useCase: 'Summarize internal documents for review.', role: 'deployer' };
const stamp = '2026-11-25T10:00:00.000Z';

type Options = {
  aal?: string; sessionId?: string; plan?: string | null; sso?: boolean;
  matchingProvider?: boolean; mutationOutcome?: string; wrongTenant?: boolean; badAudit?: boolean;
  reassess?: boolean;
};
function harness(options: Options = {}) {
  const sequence: string[] = [];
  let returned = false;
  let rejected = false;
  let auditParams: readonly unknown[] | undefined;
  const derived = deriveTrustedInventoryPatch(body);
  const mockQuery = async (sql: string, params: readonly unknown[] = []): Promise<readonly Record<string, unknown>[]> => {
    if (sql.includes('transaction_isolation')) {
      sequence.push('identity');
      return [{ actor, isolation: 'serializable', claims: {
        sub: actor, role: 'authenticated', aal: options.aal ?? 'aal2',
        session_id: options.sessionId ?? session, is_anonymous: false,
        amr: options.matchingProvider ? [{ method: 'sso/saml', provider }] : [],
      } }];
    }
    if (sql.includes('pg_advisory_xact_lock')) { sequence.push('lock'); return []; }
    if (sql.includes('qa_require_ai_inventory_actor')) {
      sequence.push('authority');
      return [{ actor, plan: options.plan === undefined ? 'starter' : options.plan }];
    }
    if (sql.includes('enterprise_identity_connections')) {
      sequence.push('sso');
      return options.sso ? [{ organization_id: org, supabase_provider_id: provider, enforce_sso: true, status: 'active', protocol: 'saml' }] : [];
    }
    if (sql.includes('create_ai_system_atomic') || sql.includes('reassess_ai_system_atomic')) {
      sequence.push('mutation');
      expect(params[options.reassess ? 1 : 0]).toBe(org);
      expect(params[options.reassess ? 3 : 1]).toBe(actor);
      expect(JSON.parse(String(params.at(-1)))).toEqual(derived.patch);
      return [{ outcome: options.mutationOutcome ?? (options.reassess ? 'updated' : 'created'), system: {
        id: system, organization_id: options.wrongTenant ? other : org, created_by: actor,
        risk_level: derived.patch.risk_level, classification_summary: derived.patch.classification_summary,
      } }];
    }
    if (sql.includes('from public.audit_events')) { sequence.push('head'); return []; }
    if (sql.includes('clock_timestamp')) { sequence.push('clock'); return [{ created_at: stamp }]; }
    if (sql.includes('append_audit_event_chained')) {
      sequence.push('audit');
      auditParams = params;
      return [{ id: params[0], organization_id: params[1], actor_user_id: params[2], action: params[3],
        entity_type: params[4], entity_id: params[5], metadata: JSON.parse(String(params[6])),
        created_at: params[7], previous_hash: params[8], event_hash: params[9],
        hash_signature: options.badAudit ? null : params[10], hash_algorithm: params[11],
      }];
    }
    throw new Error('unexpected query');
  };
  const tx: TrustedInventorySql = { query: async <T extends Record<string, unknown>>(sql: string, params?: readonly unknown[]) =>
    await mockQuery(sql, params) as readonly T[] };
  // A mock driver observes callback completion/failure; it is NOT evidence of
  // database COMMIT or rollback. The real transport must be tested separately.
  const transport: VerifiedInventoryTransaction = { async run<T>(work: (connection: TrustedInventorySql) => Promise<T>) {
    try { const value = await work(tx); returned = true; return value; }
    catch (error) { rejected = true; throw error; }
  } };
  return { transport, sequence, get returned() { return returned; }, get rejected() { return rejected; }, get auditParams() { return auditParams; } };
}

describe('trusted inventory transaction candidate (simulated transport)', () => {
  beforeEach(() => vi.stubEnv('AUDIT_CHAIN_SIGNING_SECRET', 'synthetic-test-only-key'));
  afterEach(() => vi.unstubAllEnvs());

  it('uses canonical classification and signs audit before callback completion', async () => {
    const h = harness({ sso: true, matchingProvider: true });
    await expect(executeTrustedInventoryMutation(h.transport, { kind: 'create', organizationId: org, body })).resolves.toMatchObject({ system: { id: system } });
    expect(h.sequence).toEqual(['identity','lock','authority','sso','mutation','head','clock','audit']);
    expect(h.auditParams?.[10]).toMatch(/^[0-9a-f]{64}$/);
    expect(h.auditParams?.[3]).toBe('ai_system_created');
    expect(h.returned).toBe(true);
  });

  it('reasserts commercial and SSO authority on reassessment', async () => {
    const h = harness({ reassess: true });
    await expect(executeTrustedInventoryMutation(h.transport, { kind: 'reassess', organizationId: org, systemId: system, expectedUpdatedAt: stamp, body })).resolves.toMatchObject({ system: { id: system } });
    expect(h.sequence.indexOf('authority')).toBeLessThan(h.sequence.indexOf('mutation'));
    expect(h.auditParams?.[3]).toBe('ai_system_reassessed');
  });

  it.each([
    [{ aal: 'aal1' }, 'inventory_identity_denied'],
    [{ sessionId: 'invalid' }, 'inventory_identity_denied'],
    [{ plan: null }, 'inventory_authority_denied'],
    [{ plan: 'unknown' }, 'inventory_authority_denied'],
    [{ sso: true }, 'inventory_mandatory_sso_denied'],
  ] as const)('rejects missing authority before mutation', async (options, code) => {
    const h = harness(options);
    await expect(executeTrustedInventoryMutation(h.transport, { kind: 'create', organizationId: org, body })).rejects.toThrow(code);
    expect(h.sequence).not.toContain('mutation');
    expect(h.returned).toBe(false);
  });

  it.each([
    [{ mutationOutcome: 'quota_exceeded' }, 'inventory_mutation_denied'],
    [{ wrongTenant: true }, 'inventory_mutation_readback_invalid'],
    [{ badAudit: true }, 'inventory_audit_readback_invalid'],
  ] as const)('propagates failures to the transaction driver, never reports success', async (options, code) => {
    const h = harness(options);
    await expect(executeTrustedInventoryMutation(h.transport, { kind: 'create', organizationId: org, body })).rejects.toThrow(code);
    expect(h.rejected).toBe(true);
    expect(h.returned).toBe(false);
  });

  it('rejects caller-supplied classification, audit or actor values', () => {
    for (const key of ['riskLevel','actor_user_id','hash_signature','plan','ＡＵＤＩＴ']) {
      expect(() => deriveTrustedInventoryPatch({ ...body, [key]: 'untrusted' })).toThrow('inventory_untrusted_derived_field');
    }
  });

  it('fails before opening a transaction without signing material', async () => {
    vi.stubEnv('AUDIT_CHAIN_SIGNING_SECRET', '');
    const h = harness();
    await expect(executeTrustedInventoryMutation(h.transport, { kind: 'create', organizationId: org, body })).rejects.toThrow('inventory_audit_signing_unavailable');
    expect(h.sequence).toEqual([]);
  });
});
