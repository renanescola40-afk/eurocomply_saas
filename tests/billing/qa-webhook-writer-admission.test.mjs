import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateQaWebhookAdmission } from '../../src/server/billing/qa-webhook-writer-admission.mjs';

const qa = Object.freeze({
  RISCK_QA_ENVIRONMENT: 'true',
  VERCEL_ENV: 'preview',
  NEXT_PUBLIC_SUPABASE_URL: 'https://zrxrrfbllsxtleyxjpsz.supabase.co',
});

test('non-QA production endpoint is unchanged', () => {
  assert.deepEqual(evaluateQaWebhookAdmission({
    VERCEL_ENV: 'production',
    NEXT_PUBLIC_SUPABASE_URL: 'https://tganhbbhfxcpblmgqprg.supabase.co',
  }), { allowed: true, reason: 'not_qa' });
});

test('QA preview rejects signed delivery while no authorized writer implementation exists', () => {
  assert.deepEqual(evaluateQaWebhookAdmission(qa), {
    allowed: false, reason: 'qa_webhook_writer_not_ready',
  });
});

test('explicit QA flag with production database is denied', () => {
  assert.deepEqual(evaluateQaWebhookAdmission({
    ...qa, NEXT_PUBLIC_SUPABASE_URL: 'https://tganhbbhfxcpblmgqprg.supabase.co',
  }), { allowed: false, reason: 'qa_environment_mismatch' });
});

test('QA database binding without QA flag is denied', () => {
  assert.deepEqual(evaluateQaWebhookAdmission({ ...qa, RISCK_QA_ENVIRONMENT: 'false' }), {
    allowed: false, reason: 'qa_environment_mismatch',
  });
});

test('QA outside Preview is denied', () => {
  assert.deepEqual(evaluateQaWebhookAdmission({ ...qa, VERCEL_ENV: 'production' }), {
    allowed: false, reason: 'qa_environment_mismatch',
  });
});

test('inherited service role credential does not authorize QA webhook', () => {
  assert.deepEqual(evaluateQaWebhookAdmission({ ...qa, SUPABASE_SERVICE_ROLE_KEY: 'opaque' }), {
    allowed: false, reason: 'qa_privileged_credential_forbidden',
  });
});

test('inherited alternate Supabase admin credential is denied', () => {
  for (const name of ['SUPABASE_SERVICE_KEY', 'SUPABASE_ADMIN_KEY', 'SUPABASE_SECRET_KEY']) {
    assert.deepEqual(evaluateQaWebhookAdmission({ ...qa, [name]: 'opaque' }), {
      allowed: false, reason: 'qa_privileged_credential_forbidden',
    });
  }
});

test('QA is not enabled by an arbitrary ready-looking environment flag', () => {
  assert.deepEqual(evaluateQaWebhookAdmission({ ...qa, RISCK_QA_WEBHOOK_WRITER_READY: 'true' }), {
    allowed: false, reason: 'qa_webhook_writer_not_ready',
  });
});

test('non-QA Preview is unchanged, because QA isolation guard lives separately', () => {
  assert.deepEqual(evaluateQaWebhookAdmission({
    VERCEL_ENV: 'preview',
    NEXT_PUBLIC_SUPABASE_URL: 'https://staging.example.org',
  }), { allowed: true, reason: 'not_qa' });
});
