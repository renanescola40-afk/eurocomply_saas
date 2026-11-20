import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNetlifyPreview } from './check-netlify-preview.mjs';
import { spawnSync } from 'node:child_process';

test('Netlify Production and branch deployments fail without any QA configuration', () => {
  for (const context of ['production', 'branch-deploy']) {
    assert.ok(validateNetlifyPreview({ NETLIFY: 'true', CONTEXT: context }).errors.length);
  }
});

test('a deploy preview without explicit QA setup fails closed', () => {
  assert.ok(validateNetlifyPreview({ NETLIFY: 'true', CONTEXT: 'deploy-preview' }).errors.length);
});

test('a spoofed Netlify context without platform marker fails closed', () => {
  assert.ok(validateNetlifyPreview({ CONTEXT: 'deploy-preview' }).errors.length);
});

test('Netlify Production CLI gate exits nonzero before build',()=>{
 const r=spawnSync(process.execPath,['scripts/check-netlify-preview.mjs'],{env:{NETLIFY:'true',CONTEXT:'production'},encoding:'utf8'});
 assert.equal(r.status,1);assert.match(r.stderr,/not authorized/);
});
test('Netlify preview accepts synthetic QA no-billing bootstrap',()=>{
 const env={
  NETLIFY:'true',CONTEXT:'deploy-preview',RISCK_QA_ENVIRONMENT:'true',
  SUPABASE_URL:'https://zrxrrfbllsxtleyxjpsz.supabase.co',
  NEXT_PUBLIC_SUPABASE_URL:'https://zrxrrfbllsxtleyxjpsz.supabase.co',
  STRIPE_SECRET_KEY:'',NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:'',STRIPE_WEBHOOK_SECRET:'',
  REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY:'false',QA_ALLOW_OUTBOUND_EMAIL:'false',
  RISCK_QA_BOOTSTRAP_NO_BILLING:'true',
  DEPLOY_PRIME_URL:'https://deploy-preview-2752--risck-qa.netlify.app',
  NEXT_PUBLIC_APP_URL:'https://deploy-preview-2752--risck-qa.netlify.app',
 };
 assert.deepEqual(validateNetlifyPreview(env),{checked:true,errors:[]});
});
