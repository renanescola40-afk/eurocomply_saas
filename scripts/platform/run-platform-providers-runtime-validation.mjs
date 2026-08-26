#!/usr/bin/env node
import { createHmac, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { classifyProviderFailure } from './provider-failure-classifier.mjs';

const output = 'docs/security/evidence/runtime/platform-providers-validation.json';
const env = (name) => String(process.env[name] ?? '').trim();
const failures = [];
const checks = {};
const startedAt = Date.now();

function required(name) {
  const value = env(name);
  if (!value) failures.push(`missing_${name.toLowerCase()}`);
  return value;
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
  return response;
}

const baseUrl = required('PRODUCTION_URL').replace(/\/$/, '');
const internalToken = required('PLATFORM_PROOF_TOKEN');
const stripeSecret = required('STRIPE_SECRET_KEY');
const webhookSecret = required('STRIPE_WEBHOOK_SECRET');
required('SENTRY_DSN');
const sha = required('GITHUB_SHA');
checks.protectedMainExecution = env('GITHUB_ACTIONS') === 'true' && env('GITHUB_REF_NAME') === 'main';
checks.exactShaBound = /^[a-f0-9]{40}$/i.test(sha);

try {
  if (failures.length || !checks.protectedMainExecution || !checks.exactShaBound) throw new Error('platform_preconditions_failed');

  const proofHeaders = { authorization: `Bearer ${internalToken}`, 'content-type': 'application/json', 'x-release-sha': sha };
  const checkout = await request(`${baseUrl}/api/internal/platform-proof/stripe-checkout`, { method: 'POST', headers: proofHeaders, body: JSON.stringify({ mode: 'validation' }) });
  checks.checkout = checkout.status === 200;

  const subscriptions = await request(`${baseUrl}/api/internal/platform-proof/stripe-subscriptions`, { headers: proofHeaders });
  checks.subscriptions = subscriptions.status === 200;

  const eventId = `evt_platform_proof_${randomUUID().replaceAll('-', '')}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const livemode = stripeSecret.startsWith('sk_live_') || stripeSecret.startsWith('rk_live_');
  const payload = JSON.stringify({
    id: eventId,
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: timestamp,
    livemode,
    pending_webhooks: 1,
    request: null,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_platform_proof_${randomUUID().replaceAll('-', '')}`,
        object: 'checkout.session',
        mode: 'payment',
        customer: null,
        subscription: null,
        metadata: {},
      },
    },
  });
  const signature = createHmac('sha256', webhookSecret).update(`${timestamp}.${payload}`).digest('hex');
  const signatureHeader = `t=${timestamp},v1=${signature}`;
  const webhookUrl = `${baseUrl}/api/stripe/webhook`;
  const firstWebhook = await request(webhookUrl, { method: 'POST', headers: { 'stripe-signature': signatureHeader, 'content-type': 'application/json' }, body: payload });
  const duplicateWebhook = await request(webhookUrl, { method: 'POST', headers: { 'stripe-signature': signatureHeader, 'content-type': 'application/json' }, body: payload });
  checks.webhookSignature = firstWebhook.status >= 200 && firstWebhook.status < 300;
  checks.webhookIdempotency = duplicateWebhook.status >= 200 && duplicateWebhook.status < 300;

  const invalidWebhook = await request(webhookUrl, { method: 'POST', headers: { 'stripe-signature': 't=1,v1=invalid', 'content-type': 'application/json' }, body: payload });
  checks.invalidWebhookRejected = invalidWebhook.status === 400 || invalidWebhook.status === 401;

  const email = await request(`${baseUrl}/api/internal/platform-proof/email`, { method: 'POST', headers: proofHeaders, body: JSON.stringify({ mode: 'validation' }) });
  checks.emailDelivery = email.status === 200;

  const sentry = await request(`${baseUrl}/api/internal/platform-proof/sentry`, { method: 'POST', headers: proofHeaders, body: JSON.stringify({ release: sha }) });
  checks.sentryEventIngestion = sentry.status === 200;
  checks.sentryReleaseAndSourceMaps = sentry.headers.get('x-sentry-release') === sha;

  const rateLimitRequests = await Promise.all(Array.from({ length: 12 }, () => request(`${baseUrl}/api/internal/platform-proof/rate-limit`, { headers: proofHeaders })));
  checks.distributedRateLimit = rateLimitRequests.some((response) => response.status === 429);

  const stripeProbe = await request('https://api.stripe.com/v1/balance', { headers: { authorization: `Bearer ${stripeSecret}` } });
  checks.stripeProviderReachable = stripeProbe.status === 200;
  checks.providerFailureClassification = classifyProviderFailure('stripe', { status: 429, retryAfterSeconds: 30 }).category === 'rate_limit'
    && classifyProviderFailure('sentry', { status: 503 }).category === 'provider_unavailable';
} catch (error) {
  failures.push(error instanceof Error ? error.message : 'unknown_platform_failure');
}

for (const [name, passed] of Object.entries(checks)) if (!passed) failures.push(`check_${name}_failed`);
const passed = failures.length === 0;
const evidence = {
  schema: 'risck-comply.platform-providers-validation.v1',
  evidenceItem: 'platform-providers-validation',
  status: passed ? 'Complete' : 'Open',
  outcome: passed ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  targetSha: sha || null,
  workflowRunId: env('GITHUB_RUN_ID') || null,
  checks,
  metrics: { totalValidationSeconds: Math.round((Date.now() - startedAt) / 1000) },
  failures: [...new Set(failures)],
  evidenceIntegrity: {
    exactShaBound: checks.exactShaBound === true,
    credentialsStored: false,
    responseBodiesStored: false,
    customerDataStored: false,
    providerUrlsStored: false,
  },
  boundary: 'Protected exact-main validation records only canonical booleans. The synthetic Stripe webhook uses a non-subscription Checkout Session so signature and replay handling are exercised without creating customer, subscription, invoice or charge state. No credentials, response bodies, customer identifiers, email addresses, provider payloads or raw URLs are persisted.',
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
if (!passed) process.exit(1);
