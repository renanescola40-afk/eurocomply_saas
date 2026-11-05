import test from 'node:test';
import assert from 'node:assert/strict';
import {validateQaEnvironment} from './qa-environment-guard.mjs';
const base={
 VERCEL_ENV:'preview',RISCK_QA_ENVIRONMENT:'true',
 SUPABASE_URL:'https://zrxrrfbllsxtleyxjpsz.supabase.co',
 NEXT_PUBLIC_SUPABASE_URL:'https://zrxrrfbllsxtleyxjpsz.supabase.co',
 STRIPE_SECRET_KEY:'sk_test_synthetic',NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:'pk_test_synthetic',
 STRIPE_WEBHOOK_SECRET:'whsec_synthetic',
 REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY:'false',QA_ALLOW_OUTBOUND_EMAIL:'false',
 NEXT_PUBLIC_APP_URL:'https://qa.example.vercel.app'
};
test('valid QA preview configuration passes',()=>assert.deepEqual(validateQaEnvironment(base),{checked:true,errors:[]}));
test('preview lacking QA flag fails',()=>assert.ok(validateQaEnvironment({...base,RISCK_QA_ENVIRONMENT:''}).errors.length));
test('prod database destination fails',()=>assert.ok(validateQaEnvironment({...base,SUPABASE_URL:'https://tganhbbhfxcpblmgqprg.supabase.co'}).errors.length));
test('prod database alternate variable fails',()=>assert.ok(validateQaEnvironment({...base,DATABASE_URL:'postgres://db.tganhbbhfxcpblmgqprg.supabase.co'}).errors.length));
test('Stripe LIVE fails',()=>assert.ok(validateQaEnvironment({...base,STRIPE_SECRET_KEY:'sk_live_synthetic'}).errors.length));
test('Clerk LIVE fails',()=>assert.ok(validateQaEnvironment({...base,CLERK_SECRET_KEY:'sk_live_synthetic'}).errors.length));
test('real outbound email API fails',()=>assert.ok(validateQaEnvironment({...base,RESEND_API_KEY:'re_synthetic'}).errors.length));
test('real SMTP fails',()=>assert.ok(validateQaEnvironment({...base,SMTP_HOST:'smtp.example.com'}).errors.length));
test('production app origin fails',()=>assert.ok(validateQaEnvironment({...base,NEXT_PUBLIC_APP_URL:'https://www.risckcomply.com'}).errors.length));
test('production build unchanged',()=>assert.equal(validateQaEnvironment({VERCEL_ENV:'production'}).checked,false));

test('inherited privileged service-role key fails even when opaque',()=>assert.ok(validateQaEnvironment({...base,SUPABASE_SERVICE_ROLE_KEY:'opaque_inherited_credential'}).errors.length));
test('inherited admin key fails',()=>assert.ok(validateQaEnvironment({...base,SUPABASE_ADMIN_KEY:'opaque_inherited_credential'}).errors.length));
test('restricted Stripe key fails',()=>assert.ok(validateQaEnvironment({...base,STRIPE_RESTRICTED_KEY:'rk_live_synthetic'}).errors.length));

const bootstrap={
  ...base, RISCK_QA_BOOTSTRAP_NO_BILLING:'true',
  STRIPE_SECRET_KEY:'', NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:'', STRIPE_WEBHOOK_SECRET:''
};
test('isolated no-billing bootstrap has no Stripe credentials and passes',()=>assert.deepEqual(validateQaEnvironment(bootstrap),{checked:true,errors:[]}));
test('bootstrap cannot silently activate outside explicit opt-in',()=>assert.ok(validateQaEnvironment({...bootstrap,RISCK_QA_BOOTSTRAP_NO_BILLING:''}).errors.length));
test('bootstrap rejects even TEST Stripe secret to guarantee billing disabled',()=>assert.ok(validateQaEnvironment({...bootstrap,STRIPE_SECRET_KEY:'sk_test_synthetic'}).errors.length));
test('bootstrap rejects LIVE Stripe secret',()=>assert.ok(validateQaEnvironment({...bootstrap,STRIPE_SECRET_KEY:'sk_live_synthetic'}).errors.length));
test('bootstrap cannot run in production',()=>assert.ok(validateQaEnvironment({...bootstrap,VERCEL_ENV:'production'}).errors.length));
test('regular QA rejects wrongly typed public key in server secret',()=>assert.ok(validateQaEnvironment({...base,STRIPE_SECRET_KEY:'pk_test_synthetic'}).errors.length));
test('regular QA rejects missing webhook secret',()=>assert.ok(validateQaEnvironment({...base,STRIPE_WEBHOOK_SECRET:''}).errors.length));
test('Supabase-only auth does not require obsolete Clerk keys',()=>assert.deepEqual(validateQaEnvironment(base),{checked:true,errors:[]}));
test('partial legacy Clerk TEST pair fails closed',()=>assert.ok(validateQaEnvironment({...base,CLERK_SECRET_KEY:'sk_test_synthetic'}).errors.length));
test('complete optional Clerk TEST pair passes',()=>assert.deepEqual(validateQaEnvironment({...base,CLERK_SECRET_KEY:'sk_test_synthetic',NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'pk_test_synthetic'}),{checked:true,errors:[]}));
