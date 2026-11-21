import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectQaStripeTestLedgerConfig, recordSignedQaStripeTestEvent } from '../../src/server/billing/qa-stripe-test-ledger.mjs';
const now = 1794312000;
function jwt(extra={}) {
  const encode = v => Buffer.from(JSON.stringify(v)).toString('base64url');
  return encode({alg:'HS256',typ:'JWT'})+'.'+encode({
    role:'risck_qa_stripe_event_writer', qa_project_ref:'zrxrrfbllsxtleyxjpsz', livemode:false,
    iat:now-60, exp:now+600, ...extra,
  })+'.fake-signature';
}
const validEnv = () => ({
  RISCK_QA_ENVIRONMENT:'true', VERCEL_ENV:'preview', NODE_ENV:'test',
  NEXT_PUBLIC_SUPABASE_URL:'https://zrxrrfbllsxtleyxjpsz.supabase.co',
  SUPABASE_URL:'https://zrxrrfbllsxtleyxjpsz.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:'test-project-publishable',
  STRIPE_SECRET_KEY:'sk_test_dummy', STRIPE_WEBHOOK_SECRET:'whsec_dummy',
  RISCK_QA_STRIPE_LEDGER_JWT:jwt(),
});
const stripeEvent = () => ({id:'evt_test_123456', type:'checkout.session.completed', created:now-15,livemode:false,data:{object:{}}});
test('valid restricted QA credentials pass preflight but are not proven signed',()=>{
  assert.deepEqual(inspectQaStripeTestLedgerConfig(validEnv(),now),{ready:true,reason:'qa_scoped_test_ledger_only'});
});
for(const [name,change] of [
  ['production runtime', {VERCEL_ENV:'production'}],
  ['production target', {VERCEL_TARGET_ENV:'production'}],
  ['wrong QA project', {NEXT_PUBLIC_SUPABASE_URL:'https://tganhbbhfxcpblmgqprg.supabase.co'}],
  ['privileged key', {SUPABASE_SERVICE_ROLE_KEY:'secret'}],
  ['direct PG URL', {DATABASE_URL:'postgres://test'}],
  ['LIVE Stripe key', {STRIPE_SECRET_KEY:'sk_live_never'}],
  ['missing secret', {STRIPE_WEBHOOK_SECRET:''}],
  ['no token', {RISCK_QA_STRIPE_LEDGER_JWT:''}],
  ['bad role', {RISCK_QA_STRIPE_LEDGER_JWT:jwt({role:'service_role'})}],
  ['wrong project claim', {RISCK_QA_STRIPE_LEDGER_JWT:jwt({qa_project_ref:'tganhbbhfxcpblmgqprg'})}],
  ['LIVE mode claim', {RISCK_QA_STRIPE_LEDGER_JWT:jwt({livemode:true})}],
  ['expired JWT', {RISCK_QA_STRIPE_LEDGER_JWT:jwt({exp:now-1})}],
  ['overlong JWT lifetime', {RISCK_QA_STRIPE_LEDGER_JWT:jwt({exp:now+100000})}],
]) {
  test('preflight denies '+name,()=>{const r=inspectQaStripeTestLedgerConfig({...validEnv(),...change},now);assert.equal(r.ready,false);});
}
test('rejects bad signature before database connection',async()=>{
  let attempted=false;
  await assert.rejects(()=>recordSignedQaStripeTestEvent({rawBody:'{}',signature:'bad'}, {
    env:validEnv(),nowSeconds:now,verifyStripeEvent:()=>{throw new Error('invalid');},
    createClientImpl:()=>{attempted=true;throw new Error('unreachable');},
  }),/signature_invalid/);
  assert.equal(attempted,false);
});
test('rejects LIVE event after signature before database connection',async()=>{
  let attempted=false;
  await assert.rejects(()=>recordSignedQaStripeTestEvent({rawBody:'{}',signature:'signed'}, {
    env:validEnv(),nowSeconds:now,verifyStripeEvent:()=>({...stripeEvent(),livemode:true}),
    createClientImpl:()=>{attempted=true;throw new Error('unreachable');},
  }),/event_rejected/);
  assert.equal(attempted,false);
});
function fakeDb(result={error:null},lookup={data:{id:'evt_test_123456',status:'processing'},error:null}){
  const state={rows:[],url:null,opts:null};
  const db = {from:()=>({
    insert:async row=>{state.rows.push(row);return result;},
    select:()=>({eq:()=>({maybeSingle:async()=>lookup})}),
  })};
  return {state,createClientImpl:(url,key,opts)=>{state.url=url;state.opts=opts;return db;}};
}
test('genuine TEST event intake only, no entitlement or tenant assignment',async()=>{
  const f=fakeDb();
  const r=await recordSignedQaStripeTestEvent({rawBody:'{}',signature:'signed'}, {
    env:validEnv(),nowSeconds:now,verifyStripeEvent:stripeEvent,createClientImpl:f.createClientImpl,
  });
  assert.deepEqual(r,{recorded:true,duplicate:false,status:'processing'});
  assert.equal(f.state.url,'https://zrxrrfbllsxtleyxjpsz.supabase.co');
  assert.equal(f.state.rows.length,1);
  assert.equal(f.state.rows[0].livemode,false);
  assert.equal(Object.hasOwn(f.state.rows[0],'status'),false, 'restricted intake must rely on the DB processing default');
  assert.equal(Object.hasOwn(f.state.rows[0],'organization_id'),false);
  assert.equal(f.state.rows[0].payload.qa_intake_only,true);
  assert.equal(Object.hasOwn(f.state.rows[0],'entitlements'),false);
  assert.equal(typeof f.state.opts.accessToken,'function');
});
test('idempotent duplicate lookup returns pending, not billing success',async()=>{
  const f=fakeDb({error:{code:'23505'}});
  const r=await recordSignedQaStripeTestEvent({rawBody:'{}',signature:'signed'}, {
    env:validEnv(),nowSeconds:now,verifyStripeEvent:stripeEvent,createClientImpl:f.createClientImpl,
  });
  assert.deepEqual(r,{recorded:false,duplicate:true,status:'processing'});
});
test('denies unexpected DB failures without leaking details',async()=>{
  const f=fakeDb({error:{code:'42501',message:'secret internal details'}});
  await assert.rejects(()=>recordSignedQaStripeTestEvent({rawBody:'{}',signature:'signed'}, {
    env:validEnv(),nowSeconds:now,verifyStripeEvent:stripeEvent,createClientImpl:f.createClientImpl,
  }),e=>e.message==='qa_stripe_writer_database_rejected');
});


// Netlify's Functions runtime exposes SITE_ID/SITE_NAME/URL, but not all
// build-only metadata. Scope the signed TEST intake to the QA site identity
// and reviewed deploy-preview app origin, never a no-billing manual draft.
function netlifyQaEnv(extra = {}) {
  const env = validEnv();
  delete env.VERCEL_ENV;
  return {
    ...env,
    NETLIFY: 'true',
    CONTEXT: 'deploy-preview',
    SITE_ID: 'e953293d-348c-41e8-b798-fcd1ece9c427',
    SITE_NAME: 'risck-qa-isolated',
    URL: 'https://risck-qa-isolated.netlify.app',
    DEPLOY_PRIME_URL: 'https://deploy-preview-27--risck-qa-isolated.netlify.app',
    NEXT_PUBLIC_APP_URL: 'https://deploy-preview-27--risck-qa-isolated.netlify.app',
    RISCK_QA_BOOTSTRAP_NO_BILLING: 'false',
    ...extra,
  };
}
test('bounded Netlify QA Git preview permits only scoped TEST ledger preflight', () => {
  assert.deepEqual(inspectQaStripeTestLedgerConfig(netlifyQaEnv(),now),
    {ready:true,reason:'qa_scoped_test_ledger_only'});
});
test('Netlify Functions runtime need not expose build-only variables', () => {
  const env = netlifyQaEnv();
  delete env.NETLIFY;
  delete env.CONTEXT;
  delete env.DEPLOY_PRIME_URL;
  assert.equal(inspectQaStripeTestLedgerConfig(env,now).ready,true);
});
for (const [name, overrides] of [
  ['different Netlify site ID', {SITE_ID:'00000000-0000-0000-0000-000000000000'}],
  ['different Netlify site name', {SITE_NAME:'untrusted-qa'}],
  ['untrusted Netlify main site origin', {URL:'https://example.org'}],
  ['production context', {CONTEXT:'production'}],
  ['manual QA draft', {RISCK_QA_NETLIFY_MANUAL_DRAFT:'true'}],
  ['billing bootstrap explicitly disabled', {RISCK_QA_BOOTSTRAP_NO_BILLING:'true'}],
  ['billing bootstrap context unspecified', {RISCK_QA_BOOTSTRAP_NO_BILLING:''}],
  ['Netlify/Vercel mixed markers', {VERCEL_ENV:'preview'}],
  ['Vercel production target', {VERCEL_TARGET_ENV:'production'}],
  ['wrong preview host', {NEXT_PUBLIC_APP_URL:'https://deploy-preview-27--different.netlify.app'}],
  ['Netlify base URL instead of preview', {NEXT_PUBLIC_APP_URL:'https://risck-qa-isolated.netlify.app'}],
  ['tampered preview deploy metadata', {DEPLOY_PRIME_URL:'https://deploy-preview-99--risck-qa-isolated.netlify.app'}],
  ['non-HTTPS preview', {NEXT_PUBLIC_APP_URL:'http://deploy-preview-27--risck-qa-isolated.netlify.app'}],
  ['LIVE Stripe secret', {STRIPE_SECRET_KEY:'sk_live_invalid'}],
  ['privileged Supabase key', {SUPABASE_SERVICE_ROLE_KEY:'unsafe-test-placeholder'}],
]) {
  test('Netlify QA preflight rejects '+name, () => {
    assert.deepEqual(inspectQaStripeTestLedgerConfig(netlifyQaEnv(overrides),now),
      {ready:false,reason: name === 'LIVE Stripe secret' ? 'stripe_test_binding_invalid'
        : name === 'privileged Supabase key' ? 'qa_privileged_secret_forbidden'
        : 'qa_scope_invalid'});
  });
}
test('Netlify QA signed TEST intake writes only unbound processing claim', async () => {
  const f = fakeDb();
  const result = await recordSignedQaStripeTestEvent({rawBody:'{}', signature:'signed'}, {
    env:netlifyQaEnv(), nowSeconds:now, verifyStripeEvent:stripeEvent,
    createClientImpl:f.createClientImpl,
  });
  assert.deepEqual(result,{recorded:true,duplicate:false,status:'processing'});
  assert.equal(f.state.rows.length,1);
  assert.equal(f.state.rows[0].livemode,false);
  assert.equal(Object.hasOwn(f.state.rows[0],'organization_id'),false);
  assert.equal(Object.hasOwn(f.state.rows[0],'status'),false);
  assert.equal(Object.hasOwn(f.state.rows[0],'entitlements'),false);
});
