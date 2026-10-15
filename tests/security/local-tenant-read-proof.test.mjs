import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatedFixture, assertReadProofResponse, executeReadProof, assertNonPrivilegedAnonKey,
} from '../../scripts/security/local-tenant-read-proof.mjs';

const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ad='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const bd='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const au='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const bu='ffffffff-ffff-4fff-8fff-ffffffffffff';

const anonJwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url'), 'local-synthetic-signature'].join('.');
const privilegedJwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'local-synthetic-signature'].join('.');

const env = {
  RISCK_LOCAL_TEST_CONFIRMATION:'LOCAL_SYNTHETIC_ONLY',
  NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',
  LOCAL_RLS_ANON_KEY:anonJwt,
  LOCAL_RLS_A_EMAIL:'a@example.test',LOCAL_RLS_A_PASSWORD:'a-password',
  LOCAL_RLS_B_EMAIL:'b@example.test',LOCAL_RLS_B_PASSWORD:'b-password',
  LOCAL_RLS_A_ORG_ID:a,LOCAL_RLS_B_ORG_ID:b,
  LOCAL_RLS_A_DOCUMENT_ID:ad,LOCAL_RLS_B_DOCUMENT_ID:bd,
};

function response(status,content) {
  return {ok:status>=200&&status<300,status,async json(){return content;}};
}

function mockFetch({exposeOther=false,hideOwn=false,inactiveA=false}={}) {
  return async (u,options) => {
    const url=new URL(u);
    assert.equal(url.origin,'http://127.0.0.1:54321');
    assert.equal(options.redirect,'error');
    assert.equal(options.method,url.pathname==='/auth/v1/token'?'POST':'GET');
    const token=options.headers.authorization.replace('Bearer ','');
    if (url.pathname==='/auth/v1/token') {
      const user=JSON.parse(options.body).email.startsWith('a@')?'A':'B';
      return response(200,{access_token:'token-'+user,user:{id:user==='A'?au:bu}});
    }
    const id=(url.searchParams.get('id')||'').replace(/^eq\./,'');
    const org=(url.searchParams.get('organization_id')||'').replace(/^eq\./,'');
    const user=(url.searchParams.get('user_id')||'').replace(/^eq\./,'');
    if(url.pathname.endsWith('/organization_members')) {
      const matching=(org===a&&user===au)||(org===b&&user===bu);
      const visible=(token==='token-A'&&org===a)||(token==='token-B'&&org===b);
      return response(200,matching&&(visible||exposeOther)?[{id:ad,organization_id:org,status:inactiveA&&org===a?'inactive':'active'}]:[]);
    }
    if(url.pathname.endsWith('/documents')) {
      const owner=id===ad?'A':id===bd?'B':null;
      const visible=owner&&(token==='token-'+owner&&!hideOwn || exposeOther&&token!==anonJwt);
      return response(200,visible?[{id,organization_id:owner==='A'?a:b}]:[]);
    }
    throw new Error('Unexpected request');
  };
}

test('requires explicit loopback synthetic fixture',()=>{
  assert.equal(validatedFixture(env).target,'http://127.0.0.1:54321');
});
test('rejects cloud production target',()=>{
  assert.throws(()=>validatedFixture({
    ...env,NEXT_PUBLIC_SUPABASE_URL:'https://tganhbbhfxcpblmgqprg.supabase.co',
  }),/Refusing/);
});
test('rejects privileged environment credentials',()=>{
  assert.throws(()=>validatedFixture({...env,SUPABASE_SERVICE_ROLE_KEY:'secret'}),/Privileged credential/);
});
test('rejects missing fixture, invalid UUIDs and non-synthetic identities',()=>{
  assert.throws(()=>validatedFixture({...env,LOCAL_RLS_A_PASSWORD:''}),/Missing/);
  assert.throws(()=>validatedFixture({...env,LOCAL_RLS_A_ORG_ID:'not-a-uuid'}),/Invalid/);
  assert.throws(()=>validatedFixture({...env,LOCAL_RLS_A_EMAIL:'someone@realcompany.com'}),/Non-synthetic/);
});
test('rejects same-user and same-organization fixture',()=>{
  assert.throws(()=>validatedFixture({...env,LOCAL_RLS_B_EMAIL:env.LOCAL_RLS_A_EMAIL}),/users must differ/);
  assert.throws(()=>validatedFixture({...env,LOCAL_RLS_B_ORG_ID:a}),/ORG_ID must differ/);
});
test('own and denied responses fail closed',()=>{
  assertReadProofResponse({status:200,rows:[{id:ad,organization_id:a}]},{id:ad,orgId:a},'own');
  assertReadProofResponse({status:200,rows:[]},'deny','cross');
  assert.throws(()=>assertReadProofResponse({status:200,rows:[{id:bd,organization_id:b}]},'deny','cross'),/exposed/);
  assert.throws(()=>assertReadProofResponse({status:503,rows:[]},'deny','down'),/unsuccessful/);
  assert.throws(()=>assertReadProofResponse({status:403,rows:null},{id:ad,orgId:a},'own'),/rejected/);
});
test('simulated tenant A/B isolation passes ten checks',async()=>{
  const result=await executeReadProof(env,mockFetch());
  assert.equal(result.status,'PASS');
  assert.equal(result.checksPassed,10);
  assert.equal(result.scope,'LOCAL_SYNTHETIC_READ_ONLY');
});
test('simulated cross-tenant document leak blocks proof',async()=>{
  await assert.rejects(executeReadProof(env,mockFetch({exposeOther:true})),/exposed/);
});
test('simulated own-document missing blocks proof',async()=>{
  await assert.rejects(executeReadProof(env,mockFetch({hideOwn:true})),/visibility not proven/);
});
test('network failure cannot be reported as PASS',async()=>{
  await assert.rejects(executeReadProof(env,async()=>{throw new Error('offline');}),/no cloud fallback/);
});

test('inactive membership is not accepted as valid own access',async()=>{
  await assert.rejects(executeReadProof(env,mockFetch({inactiveA:true})),/active-membership fixture not visible/);
});

test('rejects a service_role JWT passed via LOCAL_RLS_ANON_KEY',()=>{
  assert.throws(()=>validatedFixture({...env,LOCAL_RLS_ANON_KEY:privilegedJwt}),/privileged key rejected/);
});
test('rejects secret API keys and arbitrary unknown key formats',()=>{
  assert.throws(()=>assertNonPrivilegedAnonKey('sb_secret_example'),/anon-role JWT/);
  assert.throws(()=>assertNonPrivilegedAnonKey('test-anon'),/anon-role JWT/);
});
test('accepts an anon-role JWT or a publishable key',()=>{
  assert.equal(assertNonPrivilegedAnonKey(anonJwt),anonJwt);
  assert.equal(assertNonPrivilegedAnonKey('sb_publishable_local_test'), 'sb_publishable_local_test');
});
