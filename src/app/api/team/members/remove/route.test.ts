/* eslint-disable */
// @ts-nocheck — isolated synthetic provider mocks, not real tenant/PG acceptance.
import { beforeEach, describe, expect, it, vi } from 'vitest';
const ACTOR='00000000-0000-4000-8000-000000000001';
const TARGET='00000000-0000-4000-8000-000000000002';
const ORG='00000000-0000-4000-8000-000000000003';
const MEMBER='00000000-0000-4000-8000-000000000004';
const mocks=vi.hoisted(()=>({
  user:vi.fn(), permission:vi.fn(), trusted:vi.fn(), currentOrg:vi.fn(), stepUp:vi.fn(), summary:vi.fn(),
  admin:vi.fn(), select:vi.fn(), eq:vi.fn(), maybeSingle:vi.fn(), atomic:vi.fn(),
}));
vi.mock('@/server/security/api-guards',()=>({
  requireApiUser:mocks.user, requirePermission:mocks.permission, requireTrustedMutation:mocks.trusted,
  secureApiError:(_e:unknown)=>new Response(JSON.stringify({error:'internal_server_error'}),{status:500,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}),
}));
vi.mock('@/server/queries/organizations',()=>({getCurrentOrganizationForUser:mocks.currentOrg}));
vi.mock('@/server/queries/audit-events',()=>({removeMemberWithChainedAuditAtomic:mocks.atomic}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:mocks.admin}));
vi.mock('@/server/security/step-up',()=>({requireStepUpForRequest:mocks.stepUp,publicStepUpSummary:mocks.summary}));
import { POST } from './route';

function request(memberId=MEMBER){return new Request('https://app.example.test/api/team/members/remove',{method:'POST',headers:{'content-type':'application/json',origin:'https://app.example.test'},body:JSON.stringify({memberId})});}
function installMember(userId:string|null=TARGET,role='member'){
  const builder={select:mocks.select,eq:mocks.eq,maybeSingle:mocks.maybeSingle};
  mocks.select.mockReturnValue(builder);mocks.eq.mockReturnValue(builder);
  mocks.maybeSingle.mockResolvedValue({data:{id:MEMBER,user_id:userId,role,organization_id:ORG},error:null});
  mocks.admin.mockReturnValue({from:vi.fn(()=>builder)});
}
beforeEach(()=>{
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({id:ACTOR});mocks.permission.mockResolvedValue({role:'admin'});
  mocks.trusted.mockResolvedValue(null);mocks.currentOrg.mockResolvedValue({id:ORG});
  mocks.stepUp.mockResolvedValue({ok:true,assessment:{verified:true}});
  mocks.summary.mockReturnValue({verified:true});
  mocks.atomic.mockResolvedValue({row:{outcome:'removed',affected_member_id:MEMBER,affected_user_id:TARGET,previous_role:'member'},error:null});
  installMember();
});
describe('audited atomic member removal API (mocked, not provider-real)',()=>{
  it('rejects a missing organization',async()=>{
    mocks.currentOrg.mockResolvedValue(null);
    const res=await POST(request());expect(res.status).toBe(403);expect(mocks.atomic).not.toHaveBeenCalled();
  });
  it('rejects invalid IDs before database access',async()=>{
    const res=await POST(request('bad'));expect(res.status).toBe(400);
    expect(mocks.admin).not.toHaveBeenCalled();expect(mocks.atomic).not.toHaveBeenCalled();
  });
  it('requires a verified Step-Up',async()=>{
    mocks.stepUp.mockResolvedValue({ok:false,response:new Response('step up required',{status:403})});
    const res=await POST(request());expect(res.status).toBe(403);expect(mocks.atomic).not.toHaveBeenCalled();
  });
  it('rejects another tenant member without an RPC',async()=>{
    mocks.maybeSingle.mockResolvedValue({data:null,error:null});
    const res=await POST(request());expect(res.status).toBe(404);
    expect(mocks.eq).toHaveBeenCalledWith('organization_id',ORG);
    expect(mocks.atomic).not.toHaveBeenCalled();
  });
  it('prevents an administrator removing an owner',async()=>{
    installMember(TARGET,'owner');
    const res=await POST(request());expect(res.status).toBe(403);expect(mocks.atomic).not.toHaveBeenCalled();
  });
  it('fails closed on unsupported Clerk-only target',async()=>{
    installMember(null,'member');
    const res=await POST(request());expect(res.status).toBe(409);expect(mocks.atomic).not.toHaveBeenCalled();
  });
  it('calls audited atomic writer once, without a separate audit',async()=>{
    const res=await POST(request());const body=await res.json();
    expect(res.status).toBe(200);expect(body).toMatchObject({removed:true,auditPersisted:true});
    expect(mocks.atomic).toHaveBeenCalledOnce();
    expect(mocks.atomic).toHaveBeenCalledWith({
      organizationId:ORG,memberId:MEMBER,expectedUserId:TARGET,expectedRole:'member',actorUserId:ACTOR,
      metadata:{removedUserId:TARGET,role:'member',actorRole:'admin',stepUpAction:'manage_team'},
    });
  });
  it('fails closed on audit failure without a client-side membership reinsert',async()=>{
    mocks.atomic.mockResolvedValue({row:null,error:'atomic_audit_or_member_removal_failed'});
    const res=await POST(request());expect(res.status).toBe(503);expect(mocks.atomic).toHaveBeenCalledOnce();
  });
  it('rejects stale concurrent member state',async()=>{
    mocks.atomic.mockResolvedValue({row:{outcome:'state_changed'},error:null});
    const res=await POST(request());expect(res.status).toBe(409);
  });
  it('protects the final owner during owner-initiated removal',async()=>{
    mocks.permission.mockResolvedValue({role:'owner'});installMember(TARGET,'owner');
    mocks.atomic.mockResolvedValue({row:{outcome:'last_owner'},error:null});
    const res=await POST(request());expect(res.status).toBe(400);
  });
});
