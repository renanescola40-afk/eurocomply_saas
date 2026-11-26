import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ admin: vi.fn(), server: vi.fn(), sso: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: mocks.server }));
vi.mock('@/server/security/enterprise-sso-access', () => ({ enforceMandatoryEnterpriseSsoAccess: mocks.sso }));
import { getUserOrganizationMemberships } from '@/server/queries/current-organization';
const actor = '11111111-1111-4111-8111-111111111111';
const org = '22222222-2222-4222-8222-222222222222';
const row = { organization_id: org, role: 'owner', status: 'active', name: 'Synthetic QA', slug: 'synthetic-qa',
  onboarding_status: 'completed', onboarding_completed_at: '2026-11-26T12:00:00Z', selected_plan: null };
describe('restricted QA own organization context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://zrxrrfbllsxtleyxjpsz.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','');
    vi.stubEnv('VERCEL_ENV','preview');
    mocks.admin.mockImplementation(() => { throw new Error('admin_forbidden'); });
  });
  afterEach(() => vi.unstubAllEnvs());
  function client(data: unknown, error: unknown = null, user: unknown = {id:actor,is_anonymous:false}) {
    const rpc = vi.fn(async () => ({data,error}));
    mocks.server.mockResolvedValue({auth:{getUser:vi.fn(async () => ({data:{user},error:null}))},rpc});
    return rpc;
  }
  it('returns the own RPC result without privileged or additional SSO lookup', async () => {
    const rpc = client([row]);
    await expect(getUserOrganizationMemberships(actor)).resolves.toMatchObject([{id:org,role:'owner',is_onboarding_completed:true}]);
    expect(rpc).toHaveBeenCalledWith('get_my_qa_organization_context');
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.sso).not.toHaveBeenCalled(); // SQL enforces mandatory SAML atomically.
  });
  it('distinguishes genuinely empty scope from denied RPC', async () => {
    client([]);
    await expect(getUserOrganizationMemberships(actor)).resolves.toEqual([]);
    client(null,{code:'42501'});
    await expect(getUserOrganizationMemberships(actor)).rejects.toThrow('organization_memberships_unavailable');
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it.each([null,{id:org,is_anonymous:false},{id:actor,is_anonymous:true},{id:actor}])('rejects mismatched or anonymous identity',async user => {
    const rpc = client([row],null,user);
    await expect(getUserOrganizationMemberships(actor)).rejects.toThrow('organization_memberships_unavailable');
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([
    [{...row,status:'suspended'}], [{...row,role:'unrecognized'}], [{...row,organization_id:'invalid'}],
    [row,row], [{...row,extra:'unexpected'}], [{...row,onboarding_status:['completed']}],
    [{...row,onboarding_completed_at:'invalid'}], Array(101).fill(row), null,
  ])('rejects malformed authority',async data => {
    client(data);
    await expect(getUserOrganizationMemberships(actor)).rejects.toThrow('organization_memberships_unavailable');
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('keeps configured non-QA path unchanged',async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://other.invalid');
    await expect(getUserOrganizationMemberships(actor)).rejects.toThrow('admin_forbidden');
    expect(mocks.server).not.toHaveBeenCalled();
  });
});
