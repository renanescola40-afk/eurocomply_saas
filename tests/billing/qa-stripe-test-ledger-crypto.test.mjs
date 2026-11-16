import assert from 'node:assert/strict';
import test from 'node:test';
import Stripe from 'stripe';
import { recordSignedQaStripeTestEvent } from '../../src/server/billing/qa-stripe-test-ledger.mjs';

// Cryptographic SDK validation with a synthetic TEST fixture.
// This exercises the REAL Stripe signature verifier and the real QA writer
// boundary; the DB adapter is an in-memory fake. It is NOT a provider delivery,
// durable QA proof, enabled webhook, JWT signing, or BIL-02 formal PASS.
const stripe = new Stripe('sk_test_fixture_no_network');
const secret = 'whsec_local_fixture_never_deployed';
const qa = 'https://zrxrrfbllsxtleyxjpsz.supabase.co';
function env(now) {
  const enc = v => Buffer.from(JSON.stringify(v)).toString('base64url');
  const token = enc({alg:'HS256',typ:'JWT'}) + '.' + enc({
    role:'risck_qa_stripe_event_writer',
    qa_project_ref:'zrxrrfbllsxtleyxjpsz',
    livemode:false, iat:now-60, exp:now+600,
  }) + '.synthetic_unsigned_fixture';
  return {
    NODE_ENV:'test', RISCK_QA_ENVIRONMENT:'true', VERCEL_ENV:'preview',
    NEXT_PUBLIC_SUPABASE_URL:qa, SUPABASE_URL:qa,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:'qa_synthetic_publishable_fixture',
    STRIPE_SECRET_KEY:'sk_test_fixture_no_network',
    STRIPE_WEBHOOK_SECRET:secret, RISCK_QA_STRIPE_LEDGER_JWT:token,
  };
}
function payload(id, { livemode=false, type='invoice.paid', created=Math.floor(Date.now()/1000) }={}) {
  return JSON.stringify({id,object:'event',api_version:'2024-06-20',type,
    livemode,created,data:{object:{id:'in_synthetic_fixture',object:'invoice'}}});
}
function header(body, { key=secret, timestamp=Math.floor(Date.now()/1000) }={}) {
  return stripe.webhooks.generateTestHeaderString({payload:body,secret:key,timestamp});
}
function ledger() {
  const rows=new Map();
  const attempts=[];
  let constructed=0;
  const createClientImpl=(url,anonKey,options)=>{
    constructed++;
    assert.equal(url,qa);
    assert.equal(anonKey,'qa_synthetic_publishable_fixture');
    assert.equal(typeof options.accessToken,'function');
    return {
      from(table) {
        assert.equal(table,'stripe_events_processed');
        return {
          async insert(row) {
            attempts.push(row.id);
            if(rows.has(row.id))return {error:{code:'23505'}};
            rows.set(row.id,{...row,status:'processing'});
            return {error:null};
          },
          select(columns) {
            assert.equal(columns,'id,status');
            return {
              eq(column,value) {
                assert.equal(column,'id');
                return {
                  async maybeSingle() {
                    const row=rows.get(value);
                    return {data:row?{id:row.id,status:row.status}:null,error:null};
                  },
                };
              },
            };
          },
        };
      },
    };
  };
  return {rows,attempts,createClientImpl,getConstructed:()=>constructed};
}
const invoke=(body,sig,store,now)=>recordSignedQaStripeTestEvent(
  {rawBody:body,signature:sig},{env:env(now),nowSeconds:now,createClientImpl:store.createClientImpl});

test('genuine SDK-verified synthetic TEST signature records intake exactly once on duplicate',async()=>{
  const now=Math.floor(Date.now()/1000),db=ledger();
  const body=payload('evt_qa_crypto_repeat_123456',{created:now});
  const signature=header(body,{timestamp:now});
  const first=await invoke(body,signature,db,now);
  const replay=await invoke(body,signature,db,now);
  assert.deepEqual(first,{recorded:true,duplicate:false,status:'processing'});
  assert.deepEqual(replay,{recorded:false,duplicate:true,status:'processing'});
  assert.deepEqual(db.attempts,['evt_qa_crypto_repeat_123456','evt_qa_crypto_repeat_123456']);
  assert.equal(db.rows.size,1);
  const row=db.rows.get('evt_qa_crypto_repeat_123456');
  assert.deepEqual(row.payload,{
    event_id:'evt_qa_crypto_repeat_123456',
    event_type:'invoice.paid',qa_intake_only:true,
  });
  assert.equal(row.status,'processing');
  assert.equal(row.livemode,false);
  assert.equal(Object.hasOwn(row,'organization_id'),false);
  assert.equal(Object.hasOwn(row,'entitlements'),false);
});

test('HMAC mismatch on a tampered payload refuses database construction',async()=>{
  const now=Math.floor(Date.now()/1000),db=ledger();
  const signed=payload('evt_qa_crypto_tamper_123456',{created:now});
  const tampered=signed.replace('invoice.paid','invoice.payment_failed');
  await assert.rejects(()=>invoke(tampered,header(signed,{timestamp:now}),db,now),
    e=>e.message==='qa_stripe_signature_invalid');
  assert.equal(db.getConstructed(),0);
  assert.equal(db.rows.size,0);
});

test('wrong-secret and expired timestamp refuse any persistence',async()=>{
  const now=Math.floor(Date.now()/1000),db=ledger();
  const body=payload('evt_qa_crypto_old_123456',{created:now});
  for(const signed of [
    header(body,{key:'whsec_incorrect_synthetic_only',timestamp:now}),
    header(body,{timestamp:now-3600}),
  ]){
    await assert.rejects(()=>invoke(body,signed,db,now),
      e=>e.message==='qa_stripe_signature_invalid');
  }
  assert.equal(db.getConstructed(),0);
  assert.equal(db.rows.size,0);
});

test('even a correctly HMAC-signed LIVE event is rejected before QA database',async()=>{
  const now=Math.floor(Date.now()/1000),db=ledger();
  const body=payload('evt_qa_crypto_live_123456',{livemode:true,created:now});
  await assert.rejects(()=>invoke(body,header(body,{timestamp:now}),db,now),
    e=>e.message==='qa_stripe_event_rejected');
  assert.equal(db.getConstructed(),0);
});

test('a valid TEST signature cannot bypass the strict QA credential isolation',async()=>{
  const now=Math.floor(Date.now()/1000),db=ledger();
  const body=payload('evt_qa_crypto_prod_123456',{created:now});
  const settings={...env(now),NEXT_PUBLIC_SUPABASE_URL:'https://tganhbbhfxcpblmgqprg.supabase.co'};
  await assert.rejects(()=>recordSignedQaStripeTestEvent(
    {rawBody:body,signature:header(body,{timestamp:now})},
    {env:settings,nowSeconds:now,createClientImpl:db.createClientImpl}),
  e=>e.message==='qa_stripe_writer_unavailable');
  assert.equal(db.getConstructed(),0);
});
