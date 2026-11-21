import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNetlifyPreview } from './check-netlify-preview.mjs';
import { prepareNetlifyQaBuildEnv } from './netlify-qa-build.mjs';
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

const NETLIFY_REMOTE_DRAFT_BASE = {
  ...QA_MANUAL_DRAFT_BASE,
  SITE_ID: 'e953293d-348c-41e8-b798-fcd1ece9c427',
  SITE_NAME: 'risck-qa-isolated',
  DEPLOY_ID: '5b243e66dd6a547b4fee73ae',
  DEPLOY_URL: 'https://5b243e66dd6a547b4fee73ae--risck-qa-isolated.netlify.app',
  DEPLOY_PRIME_URL: 'https://5b243e66dd6a547b4fee73ae--risck-qa-isolated.netlify.app',
};

test('remote Netlify draft binds verified immutable QA URL before build', () => {
  const prepared = prepareNetlifyQaBuildEnv(NETLIFY_REMOTE_DRAFT_BASE);
  assert.deepEqual(prepared.errors, []);
  assert.equal(prepared.env.NEXT_PUBLIC_APP_URL, NETLIFY_REMOTE_DRAFT_BASE.DEPLOY_URL);
  assert.equal(NETLIFY_REMOTE_DRAFT_BASE.NEXT_PUBLIC_APP_URL, QA_MANUAL_DRAFT_BASE.NEXT_PUBLIC_APP_URL);
  assert.deepEqual(validateNetlifyPreview(prepared.env), { checked: true, errors: [] });
});

test('remote Netlify QA draft rejects forged site/deploy metadata, production and secrets', () => {
  for (const changed of [
    { SITE_ID: 'e953293d-348c-41e8-b798-fcd1ece9c428' },
    { SITE_NAME: 'risckcomply' },
    { DEPLOY_ID: 'not-a-deploy-id' },
    { DEPLOY_URL: 'https://risck-qa-isolated.netlify.app' },
    { DEPLOY_URL: 'https://5b243e66dd6a547b4fee73ae--other.netlify.app' },
    { DEPLOY_PRIME_URL: 'https://www.risckcomply.com' },
    { CONTEXT: 'production' },
    { NETLIFY: undefined },
    { RISCK_QA_NETLIFY_MANUAL_DRAFT: undefined },
    { RISCK_QA_BOOTSTRAP_NO_BILLING: undefined },
    { RISCK_QA_ENVIRONMENT: 'false' },
    { SUPABASE_URL: 'https://tganhbbhfxcpblmgqprg.supabase.co' },
    { SUPABASE_SERVICE_ROLE_KEY: 'synthetic-no-privilege' },
    { STRIPE_SECRET_KEY: 'sk_live_synthetic' },
    { QA_ALLOW_OUTBOUND_EMAIL: 'true' },
    { NEXT_PUBLIC_APP_URL: 'https://www.risckcomply.com' },
  ]) {
    const result = prepareNetlifyQaBuildEnv({ ...NETLIFY_REMOTE_DRAFT_BASE, ...changed });
    assert.ok(result.errors.length > 0, JSON.stringify(Object.keys(changed)));
  }
});

test('remote Netlify QA draft may use the canonical QA site as prime URL', () => {
  const prepared = prepareNetlifyQaBuildEnv({
    ...NETLIFY_REMOTE_DRAFT_BASE,
    DEPLOY_PRIME_URL: 'https://risck-qa-isolated.netlify.app',
  });
  assert.deepEqual(prepared.errors, []);
});

test('Netlify CLI local QA build excludes unverified placeholder deploy metadata but keeps all QA guards', () => {
  const prepared = prepareNetlifyQaBuildEnv({
    ...QA_MANUAL_DRAFT_BASE,
    NETLIFY_LOCAL: 'true',
    SITE_ID: 'e953293d-348c-41e8-b798-fcd1ece9c427',
    SITE_NAME: 'risck-qa-isolated',
    DEPLOY_ID: 'local-preview-not-a-remote-deploy',
    DEPLOY_URL: 'http://localhost:8888',
    DEPLOY_PRIME_URL: 'http://localhost:8888',
  });
  assert.deepEqual(prepared.errors, []);
  for (const field of ['DEPLOY_ID', 'DEPLOY_URL', 'DEPLOY_PRIME_URL']) {
    assert.equal(prepared.env[field], undefined, field);
  }
  assert.equal(prepared.env.NEXT_PUBLIC_APP_URL, QA_MANUAL_DRAFT_BASE.NEXT_PUBLIC_APP_URL);
  assert.deepEqual(validateNetlifyPreview(prepared.env), { checked: true, errors: [] });
});

test('Netlify local CLI path cannot bypass site/context/flag/security or misrepresent remote deployments', () => {
  const local = {
    ...QA_MANUAL_DRAFT_BASE,
    NETLIFY_LOCAL: 'true',
    SITE_ID: 'e953293d-348c-41e8-b798-fcd1ece9c427',
    SITE_NAME: 'risck-qa-isolated',
    DEPLOY_ID: 'local-placeholder',
    DEPLOY_URL: 'http://localhost:8888',
    DEPLOY_PRIME_URL: 'http://localhost:8888',
  };
  for (const changed of [
    { SITE_ID: 'not-the-qa-site' },
    { SITE_NAME: 'production-site' },
    { NETLIFY: undefined },
    { NETLIFY_LOCAL: undefined },
    { CONTEXT: 'production' },
    { CONTEXT: 'branch-deploy' },
    { RISCK_QA_NETLIFY_MANUAL_DRAFT: undefined },
    { RISCK_QA_BOOTSTRAP_NO_BILLING: undefined },
    { RISCK_QA_ENVIRONMENT: 'false' },
    { NEXT_PUBLIC_APP_URL: 'https://www.risckcomply.com' },
    { NEXT_PUBLIC_SUPABASE_URL: 'https://tganhbbhfxcpblmgqprg.supabase.co' },
    { SUPABASE_SERVICE_ROLE_KEY: 'synthetic' },
    { STRIPE_SECRET_KEY: 'sk_live_synthetic' },
    { QA_ALLOW_OUTBOUND_EMAIL: 'true' },
    // A real-looking provider ID with inconsistent URLs may never be stripped.
    { DEPLOY_ID: '5b243e66dd6a547b4fee73ae' },
  ]) {
    const prepared = prepareNetlifyQaBuildEnv({ ...local, ...changed });
    assert.ok(prepared.errors.length > 0, Object.keys(changed).join(', '));
  }
});
