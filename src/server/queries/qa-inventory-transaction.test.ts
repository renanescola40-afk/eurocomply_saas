import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { query, connect, end, getClaims, getUser, getSession } = vi.hoisted(() => ({
  query: vi.fn(), connect: vi.fn(), end: vi.fn(),
  getClaims: vi.fn(), getUser: vi.fn(), getSession: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('pg', () => ({ Client: class { query = query; connect = connect; end = end; } }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({ auth: { getClaims, getUser, getSession } }),
}));
vi.mock('@/server/queries/current-organization', () => ({ getUserOrganizationMemberships: vi.fn() }));
vi.mock('@/server/security/api-guards', () => ({
  ApiSecurityError: class extends Error { constructor(input: { message: string }) { super(input.message); } },
}));

const organizationId = '11111111-1111-4111-8111-111111111111';
const actorUserId = '22222222-2222-4222-8222-222222222222';
const systemId = '33333333-3333-4333-8333-333333333333';
const url = 'https://zrxrrfbllsxtleyxjpsz.supabase.co';
const claims = {
  sub: actorUserId, iss: `${url}/auth/v1`, role: 'authenticated', aal: 'aal2',
  is_anonymous: false, session_id: '44444444-4444-4444-8444-444444444444',
};

beforeEach(() => {
  vi.resetAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.QA_INVENTORY_DATABASE_URL = `postgresql://qa_inventory_writer.zrxrrfbllsxtleyxjpsz:secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=verify-full`;
  process.env.AUDIT_CHAIN_SIGNING_SECRET = 'test-signing-secret';
  delete process.env.VERCEL_ENV;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  getSession.mockResolvedValue({ data: { session: { access_token: 'signed-access-token' } }, error: null });
  getClaims.mockResolvedValue({ data: { claims }, error: null });
  getUser.mockResolvedValue({ data: { user: { id: actorUserId } }, error: null });
  connect.mockResolvedValue(undefined);
  end.mockResolvedValue(undefined);
  query.mockImplementation(async (sql: string) => {
    if (sql.includes('current_user')) return { rows: [{ role: 'qa_inventory_writer', db: 'postgres' }] };
    if (sql.includes('qa_inventory_audit_head')) return { rows: [{ head: null }] };
    if (sql.includes('qa_inventory_mutate')) return { rows: [{ transition: { outcome: 'created', system: { id: systemId, organization_id: organizationId } } }] };
    return { rows: [] };
  });
});
afterEach(() => {
  delete process.env.QA_INVENTORY_DATABASE_URL;
  delete process.env.AUDIT_CHAIN_SIGNING_SECRET;
});

describe('QA inventory transaction boundary', () => {
  const input = {
    organizationId, actorUserId, patch: { name: 'Test system' },
    auditMetadata: () => ({ riskLevel: 'minimal' }),
  };

  it('commits only after signed audit append on the same client', async () => {
    const { mutateQaInventory } = await import('./qa-inventory-transaction');
    const result = await mutateQaInventory(input);
    expect(result.outcome).toBe('created');
    const sql = query.mock.calls.map(([statement]) => statement);
    expect(sql.indexOf('BEGIN')).toBeLessThan(sql.findIndex((statement) => statement.includes('qa_inventory_mutate')));
    expect(sql.findIndex((statement) => statement.includes('qa_inventory_mutate'))).toBeLessThan(sql.findIndex((statement) => statement.includes('qa_inventory_append')));
    expect(sql.findIndex((statement) => statement.includes('qa_inventory_append'))).toBeLessThan(sql.indexOf('COMMIT'));
    const audit = JSON.parse(query.mock.calls.find(([statement]) => statement.includes('qa_inventory_append'))?.[1][1]);
    expect(audit.entityId).toBe(systemId);
    expect(audit.signature).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rolls back mutation when the audit append fails', async () => {
    const original = query.getMockImplementation()!;
    query.mockImplementation((sql: string, ...args: unknown[]) => sql.includes('qa_inventory_append')
      ? Promise.reject(new Error('audit unavailable')) : original(sql, ...args));
    const { mutateQaInventory } = await import('./qa-inventory-transaction');
    await expect(mutateQaInventory(input)).rejects.toThrow('qa_inventory_transaction_unavailable');
    expect(query.mock.calls.map(([statement]) => statement)).toContain('ROLLBACK');
    expect(query.mock.calls.map(([statement]) => statement)).not.toContain('COMMIT');
  });

  it('rejects AAL1 before opening a database connection', async () => {
    getClaims.mockResolvedValue({ data: { claims: { ...claims, aal: 'aal1' } }, error: null });
    const { mutateQaInventory } = await import('./qa-inventory-transaction');
    await expect(mutateQaInventory(input)).rejects.toThrow('Verified AAL2 session required.');
    expect(connect).not.toHaveBeenCalled();
  });

  it('rejects an administrative database URL', async () => {
    process.env.QA_INVENTORY_DATABASE_URL = 'postgresql://postgres:secret@db.zrxrrfbllsxtleyxjpsz.supabase.co:5432/postgres';
    const { mutateQaInventory } = await import('./qa-inventory-transaction');
    await expect(mutateQaInventory(input)).rejects.toThrow('qa_inventory_transport_unavailable');
    expect(connect).not.toHaveBeenCalled();
  });

  it('refuses any QA preview with a service-role secret', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'forbidden-preview-key';
    const { mutateQaInventory } = await import('./qa-inventory-transaction');
    await expect(mutateQaInventory(input)).rejects.toThrow('qa_inventory_admin_key_forbidden');
    expect(connect).not.toHaveBeenCalled();
  });
});
