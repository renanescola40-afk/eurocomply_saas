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

const QA_MANUAL_DRAFT_BASE = {
  NETLIFY: 'true',
  CONTEXT: 'deploy-preview',
  RISCK_QA_ENVIRONMENT: 'true',
  RISCK_QA_BOOTSTRAP_NO_BILLING: 'true',
  RISCK_QA_NETLIFY_MANUAL_DRAFT: 'true',
  SUPABASE_URL: 'https://zrxrrfbllsxtleyxjpsz.supabase.co',
  NEXT_PUBLIC_SUPABASE_URL: 'https://zrxrrfbllsxtleyxjpsz.supabase.co',
  REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY: 'false',
  QA_ALLOW_OUTBOUND_EMAIL: 'false',
  NEXT_PUBLIC_APP_URL: 'https://qa-manual-72e40520--risck-qa-isolated.netlify.app',
};

test('CLI draft accepts explicit isolated QA alias without a Git import', () => {
  assert.deepEqual(validateNetlifyPreview(QA_MANUAL_DRAFT_BASE), { checked: true, errors: [] });
  assert.deepEqual(validateNetlifyPreview({
    ...QA_MANUAL_DRAFT_BASE,
    DEPLOY_PRIME_URL: QA_MANUAL_DRAFT_BASE.NEXT_PUBLIC_APP_URL,
  }), { checked: true, errors: [] });
});

test('CLI draft is denied without explicit opt-in or matching provider metadata', () => {
  for (const changed of [
    { RISCK_QA_NETLIFY_MANUAL_DRAFT: undefined },
    { NETLIFY: undefined },
    { CONTEXT: 'production' },
    { CONTEXT: 'branch-deploy' },
    { RISCK_QA_ENVIRONMENT: undefined },
    { RISCK_QA_BOOTSTRAP_NO_BILLING: undefined },
    { DEPLOY_PRIME_URL: 'https://deploy-preview-12--risck-qa-isolated.netlify.app' },
  ]) {
    assert.ok(validateNetlifyPreview({ ...QA_MANUAL_DRAFT_BASE, ...changed }).errors.length > 0);
  }
});

test('CLI draft rejects production-branded or arbitrary site aliases and credentials', () => {
  for (const changed of [
    { NEXT_PUBLIC_APP_URL: 'https://qa-manual-72e40520--www-risckcomply.netlify.app' },
    { NEXT_PUBLIC_APP_URL: 'https://qa-manual-72e40520--risckcomply.netlify.app' },
    { NEXT_PUBLIC_APP_URL: 'https://qa-manual-72e4052x--risck-qa-isolated.netlify.app' },
    { NEXT_PUBLIC_APP_URL: 'https://risck-qa-isolated.netlify.app' },
    { NEXT_PUBLIC_APP_URL: 'http://qa-manual-72e40520--risck-qa-isolated.netlify.app' },
    { SUPABASE_URL: 'https://tganhbbhfxcpblmgqprg.supabase.co' },
    { SUPABASE_SERVICE_ROLE_KEY: 'synthetic-never-valid' },
    { STRIPE_SECRET_KEY: 'sk_live_synthetic' },
    { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_synthetic' },
    { QA_ALLOW_OUTBOUND_EMAIL: 'true' },
  ]) {
    assert.ok(validateNetlifyPreview({ ...QA_MANUAL_DRAFT_BASE, ...changed }).errors.length > 0);
  }
});
