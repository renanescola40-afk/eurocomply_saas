import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyQat01NativeChecks,REQUIRED_CHECKS,CIRCLECI_CONTEXT} from '../../scripts/enterprise-evidence/verify-qat01-native-checks.mjs';
const sha='a'.repeat(40), token='mock_readonly_token';
const start='2026-11-12T21:20:00Z', finish='2026-11-12T21:30:00Z';
function run(name,id,status='completed',conclusion='success'){
 return {name,id,head_sha:sha,status,conclusion,started_at:start,completed_at:finish,
  app:{name:'GitHub Actions',slug:'github-actions',id:15368},
  html_url:'https://github.com/renanescola40-afk/eurocomply_saas/actions/runs/123/job/'+id};
}
function ci(state='success'){
 return {context:CIRCLECI_CONTEXT,state,updated_at:finish,target_url:'https://app.circleci.com/pipelines/github/renanescola40-afk/eurocomply_saas/99'};
}
const all=()=>REQUIRED_CHECKS.map((name,i)=>run(name,i+1));
function provider({runs=all(),statuses=[ci()],error=false}={}){
 return async(url,opts)=>{
  assert.ok(url.includes('/commits/'+sha+'/'));
  assert.equal(opts.headers.Authorization,'Bearer '+token);
  if(error)return {ok:false};
  return {ok:true,json:async()=>url.includes('/check-runs')?{total_count:runs.length,check_runs:runs}:{statuses}};
 };
}
const check=o=>verifyQat01NativeChecks({sha,token,request:provider(o)});
test('successful authenticated exact-SHA checks are evidence-only, not formal PASS',async()=>{
 const r=await check({});
 assert.equal(r.decision,'SOURCE_CI_VERIFIED_PENDING_INDEPENDENT_ACCEPTANCE');
 assert.equal(r.formal_gate_acceptance,'NOT_ACCEPTED');
 assert.equal(r.production_release_authorized,false);
 assert.equal(r.checks.length,REQUIRED_CHECKS.length);
});
test('missing mandatory check fails closed',async()=>{
 const r=await check({runs:all().slice(1)});
 assert.equal(r.decision,'NOT_VERIFIED');
 assert.ok(r.errors.some(e=>e.includes('missing_authenticated_check')));
});
test('latest check failure cannot reuse an older success',async()=>{
 const runs=all();runs.push({...run(REQUIRED_CHECKS[0],300,'completed','failure'),started_at:'2026-11-12T22:00:00Z'});
 const r=await check({runs});
 assert.equal(r.decision,'NOT_VERIFIED');
 assert.ok(r.errors.some(e=>e.includes('latest_required_check_not_success')));
});
test('check from wrong SHA or untrusted App cannot be used',async()=>{
 const runs=all();runs[0].head_sha='f'.repeat(40);runs[1].app.slug='evil-ci';
 const r=await check({runs});
 assert.equal(r.decision,'NOT_VERIFIED');
 assert.equal(r.errors.filter(e=>e.startsWith('missing_authenticated_check')).length,2);
});
test('CircleCI pending, untrusted URL and missing context fail closed',async()=>{
 assert.equal((await check({statuses:[ci('pending')]})).decision,'NOT_VERIFIED');
 assert.equal((await check({statuses:[{...ci(),target_url:'https://example.org/ci'}]})).decision,'NOT_VERIFIED');
 assert.equal((await check({statuses:[]})).decision,'NOT_VERIFIED');
});
test('provider error and invalid SHA never grant PASS or expose the token',async()=>{
 const r=await check({error:true});
 assert.equal(r.decision,'NOT_VERIFIED');assert.doesNotMatch(JSON.stringify(r),/mock_readonly_token/);
 const invalid=await verifyQat01NativeChecks({sha:'main',token,request:provider({})});
 assert.equal(invalid.decision,'NOT_VERIFIED');
});
test('incomplete check pagination fails closed',async()=>{
 const request=async url=>({ok:true,json:async()=>url.includes('/check-runs')?{total_count:200,check_runs:all()}:{statuses:[ci()]}});
 const r=await verifyQat01NativeChecks({sha,token,request});
 assert.equal(r.decision,'NOT_VERIFIED');
 assert.deepEqual(r.errors,['provider_readback_incomplete']);
});
