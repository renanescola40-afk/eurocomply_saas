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

assert(/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl), 'NEXT_PUBLIC_SUPABASE_URL must be a canonical HTTPS Supabase project URL');
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
  let googleRedirect;
  try {
    googleRedirect = new URL(googleLocation);
  } catch {
    throw new Error('google oauth redirect target is not a valid URL');
  }
  const googleHost = googleRedirect.hostname.toLowerCase();
  assert(
    googleRedirect.protocol === 'https:' &&
      (googleHost === 'google.com' || googleHost === 'accounts.google.com' || googleHost.endsWith('.google.com')),
    'google oauth redirect target is not Google',
  );

  const content = `RISCK COMPLY controlled-documents runtime canary ${suffix}\n`;
  storagePath = `runtime-canary/${userId}/${randomUUID()}.md`;
  const uploadResponse = await request(`/storage/v1/object/controlled-documents/${storagePath}`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'text/markdown',
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
  let resendResponse = null;
  let resendError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      resendResponse = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${resendKey}` },
        signal: AbortSignal.timeout(30000),
      });
      if (resendResponse.ok || resendResponse.status < 500) break;
    } catch (error) {
      resendError = error;
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }
  assert(resendResponse, `Resend API validation unavailable: ${resendError instanceof Error ? resendError.message : 'network_error'}`);
  const resendDomains = await json(resendResponse);
  assert(resendResponse.ok, `Resend API key validation failed: ${resendResponse.status}`);
  const fromMatch = emailFrom.match(/<([^>]+)>/)?.[1] ?? emailFrom;
  const fromDomain = fromMatch.trim().toLowerCase().split('@')[1] ?? '';
  assert(fromDomain, 'EMAIL_FROM must contain a valid sender domain');
  const verifiedDomains = Array.isArray(resendDomains?.data)
    ? resendDomains.data.filter((domain) => domain?.status === 'verified').map((domain) => String(domain?.name ?? '').toLowerCase())
    : [];
  assert(verifiedDomains.some((domain) => fromDomain === domain || fromDomain.endsWith(`.${domain}`)), 'EMAIL_FROM domain is not verified in Resend');

  console.log(JSON.stringify({
    authAdminCreate: 'PASS',
    passwordLogin: 'PASS',
    googleOAuthInitiation: 'PASS',
    controlledDocumentsStorageRoundTrip: 'PASS',
    transactionalEmailAuditTable: 'PASS',
    resendApiBinding: 'PASS',
  }));
} finally {
  const cleanupFailures = [];
  async function cleanup(label, path, init) {
    try {
      const response = await request(path, init);
      if (!response.ok) cleanupFailures.push(`${label}:${response.status}`);
      await response.body?.cancel().catch(() => undefined);
    } catch (error) {
      cleanupFailures.push(`${label}:${error instanceof Error ? error.message : 'request_failed'}`);
    }
  }

  if (emailLogId) {
    await cleanup('email_log', `/rest/v1/email_delivery_logs?id=eq.${encodeURIComponent(emailLogId)}`, {
      method: 'DELETE',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
  }
  if (storagePath) {
    await cleanup('storage_object', '/storage/v1/object/controlled-documents', {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: [storagePath] }),
    });
  }
  if (userId) {
    await cleanup('auth_user', `/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
  }
  if (cleanupFailures.length > 0) throw new Error(`Production canary cleanup failed: ${cleanupFailures.join(', ')}`);
}
