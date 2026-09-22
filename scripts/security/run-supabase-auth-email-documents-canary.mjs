#!/usr/bin/env node
import { randomBytes, randomUUID } from 'node:crypto';

const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const anonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '');
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '');
const resendKey = String(process.env.RESEND_API_KEY ?? '');
const emailFrom = String(process.env.EMAIL_FROM ?? '');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { raw: text.slice(0, 500) }; }
}

async function request(path, init = {}) {
  return fetch(path.startsWith('http') ? path : `${supabaseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(15000),
  });
}

assert(/^https:\/\//.test(supabaseUrl), 'NEXT_PUBLIC_SUPABASE_URL must be HTTPS');
assert(anonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY missing');
assert(serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY missing');

const suffix = `${Date.now()}-${randomBytes(5).toString('hex')}`;
const email = `qa-runtime-${suffix}@example.invalid`;
const password = `Rc!${randomBytes(18).toString('base64url')}9z`;
let userId = null;
let storagePath = null;
let emailLogId = null;

try {
  const createUserResponse = await request('/auth/v1/admin/users', {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { runtime_canary: true },
    }),
  });
  const createdUser = await json(createUserResponse);
  assert(createUserResponse.ok && createdUser?.id, `auth admin create failed: ${createUserResponse.status}`);
  userId = createdUser.id;

  const passwordLoginResponse = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  const passwordLogin = await json(passwordLoginResponse);
  assert(passwordLoginResponse.ok && passwordLogin?.access_token && passwordLogin?.user?.id === userId, `password login failed: ${passwordLoginResponse.status}`);

  const googleAuthorizeUrl = new URL('/auth/v1/authorize', supabaseUrl);
  googleAuthorizeUrl.searchParams.set('provider', 'google');
  googleAuthorizeUrl.searchParams.set('redirect_to', 'https://www.risckcomply.com/auth/callback?locale=en');
  const googleResponse = await fetch(googleAuthorizeUrl, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  });
  const googleLocation = googleResponse.headers.get('location') ?? '';
  assert([301,302,303,307,308].includes(googleResponse.status), `google oauth did not redirect: ${googleResponse.status}`);
  assert(/google\./i.test(googleLocation) || /accounts\.google\.com/i.test(googleLocation), 'google oauth redirect target is not Google');

  const content = `RISCK COMPLY controlled-documents runtime canary ${suffix}\n`;
  storagePath = `runtime-canary/${userId}/${randomUUID()}.txt`;
  const uploadResponse = await request(`/storage/v1/object/controlled-documents/${storagePath}`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'text/plain',
      'x-upsert': 'false',
    },
    body: content,
  });
  assert(uploadResponse.ok, `storage upload failed: ${uploadResponse.status}`);
  await uploadResponse.body?.cancel().catch(() => undefined);

  const downloadResponse = await request(`/storage/v1/object/authenticated/controlled-documents/${storagePath}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  const downloaded = await downloadResponse.text();
  assert(downloadResponse.ok && downloaded === content, `storage download mismatch: ${downloadResponse.status}`);

  const logInsertResponse = await request('/rest/v1/email_delivery_logs?select=id,status,provider', {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      recipient: email,
      recipient_hash: randomBytes(32).toString('hex'),
      template: 'security_alert',
      status: 'skipped',
      provider: 'console',
      attempts: 0,
      subject: 'Runtime canary',
      idempotency_key: `runtime-canary:${suffix}`,
      metadata: { runtime_canary: true },
    }),
  });
  const logRows = await json(logInsertResponse);
  assert(logInsertResponse.ok && Array.isArray(logRows) && logRows[0]?.id, `email audit insert failed: ${logInsertResponse.status}`);
  emailLogId = logRows[0].id;

  assert(resendKey && emailFrom, 'Resend production binding missing');
  const resendResponse = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${resendKey}` },
    signal: AbortSignal.timeout(15000),
  });
  assert(resendResponse.ok, `Resend API key validation failed: ${resendResponse.status}`);
  await resendResponse.body?.cancel().catch(() => undefined);

  console.log(JSON.stringify({
    authAdminCreate: 'PASS',
    passwordLogin: 'PASS',
    googleOAuthInitiation: 'PASS',
    controlledDocumentsStorageRoundTrip: 'PASS',
    transactionalEmailAuditTable: 'PASS',
    resendApiBinding: 'PASS',
  }));
} finally {
  if (emailLogId) {
    await request(`/rest/v1/email_delivery_logs?id=eq.${encodeURIComponent(emailLogId)}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }).catch(() => undefined);
  }
  if (storagePath) {
    await request(`/storage/v1/object/controlled-documents/${storagePath}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }).catch(() => undefined);
  }
  if (userId) {
    await request(`/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }).catch(() => undefined);
  }
}
