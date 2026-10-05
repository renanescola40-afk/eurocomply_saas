import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  user: vi.fn(), organization: vi.fn(), permission: vi.fn(), admin: vi.fn(),
  single: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }));
vi.mock('@/server/queries/organizations', () => ({ getCurrentOrganizationForUser: mocks.organization }));
vi.mock('@/server/security/rbac', () => ({ assertOrganizationPermission: mocks.permission, permissionDeniedResponse: () => Response.json({ error: 'forbidden' }, { status: 403 }) }));
vi.mock('@/server/security/api-guards', () => ({ requireApiUser: mocks.user, parseJsonBodyWithZod: vi.fn(), secureApiError: () => Response.json({ error: 'internal_server_error' }, { status: 500 }) }));
vi.mock('@/lib/security/rate-limit', () => ({ checkDistributedRateLimit: vi.fn() }));
vi.mock('@/server/billing/entitlements', () => ({ assertPlanAtLeast: vi.fn() }));
vi.mock('@/server/queries/audit-events', () => ({ createAuditEvent: vi.fn() }));
vi.mock('@/server/security/origin-guard', () => ({ assertTrustedOrigin: vi.fn() }));
vi.mock('@/server/security/no-store', () => ({ noStoreJson: (body: unknown, init?: ResponseInit) => Response.json(body, { ...init, headers: { 'cache-control': 'no-store' } }) }));
import { GET } from '@/app/api/gap-analysis/route';

describe('latest assessment restoration boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.mockResolvedValue({ id: 'actor' });
    mocks.organization.mockResolvedValue({ id: 'active-tenant' });
    mocks.permission.mockResolvedValue({ ok: true });
    const query = { select: mocks.select, eq: mocks.eq, order: mocks.order, limit: mocks.limit, maybeSingle: mocks.single };
    for (const method of [mocks.select, mocks.eq, mocks.order, mocks.limit]) method.mockReturnValue(query);
    mocks.admin.mockReturnValue({ from: () => query });
  });
  it('returns the saved seven answers and derives identity from the server, not request parameters', async () => {
    const answers = Array.from({ length: 7 }, (_, i) => ({ question_id: `q-${i}`, answer: 'no', score: 0 }));
    mocks.single.mockResolvedValue({ data: { id: 'saved', answers }, error: null });
    const response = (await GET(new Request('https://test.invalid/api/gap-analysis?view=latest&organizationId=foreign&userId=foreign')))!;
    expect(response.status).toBe(200);
    expect((await response.json()).assessment.answers).toEqual(answers);
    expect(mocks.eq.mock.calls).toEqual([['organization_id', 'active-tenant'], ['user_id', 'actor']]);
    expect(mocks.select).toHaveBeenCalledWith(expect.stringContaining('answers:gap_answers('));
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('returns explicit null only when there is no saved assessment', async () => {
    mocks.single.mockResolvedValue({ data: null, error: null });
    expect(await (await GET(new Request('https://test.invalid/api/gap-analysis')))! .json()).toEqual({ assessment: null });
  });
  it('does not turn database failure into an apparently empty questionnaire', async () => {
    mocks.single.mockResolvedValue({ data: null, error: new Error('provider failed') });
    expect((await GET(new Request('https://test.invalid/api/gap-analysis')))! .status).toBe(500);
  });
  it('does not query privileged data when tenant permission is denied', async () => {
    mocks.permission.mockResolvedValue({ ok: false });
    expect((await GET(new Request('https://test.invalid/api/gap-analysis')))! .status).toBe(403);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
});
