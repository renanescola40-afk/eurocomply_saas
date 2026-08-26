import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/platform-providers-runtime-proof.yml', 'utf8');
const runner = readFileSync('scripts/platform/run-platform-providers-runtime-validation.mjs', 'utf8');
const validator = readFileSync('scripts/platform/check-platform-providers-evidence.mjs', 'utf8');
const classifier = readFileSync('scripts/platform/provider-failure-classifier.mjs', 'utf8');
const boundary = readFileSync('src/server/security/platform-proof.ts', 'utf8');
const checkoutRoute = readFileSync('src/app/api/internal/platform-proof/stripe-checkout/route.ts', 'utf8');
const subscriptionsRoute = readFileSync('src/app/api/internal/platform-proof/stripe-subscriptions/route.ts', 'utf8');
const emailRoute = readFileSync('src/app/api/internal/platform-proof/email/route.ts', 'utf8');
const sentryRoute = readFileSync('src/app/api/internal/platform-proof/sentry/route.ts', 'utf8');
const rateLimitRoute = readFileSync('src/app/api/internal/platform-proof/rate-limit/route.ts', 'utf8');

describe('platform providers revenue megapack', () => {
  it('runs only through a protected manual exact-main workflow', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production-platform-proof');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
  });

  it('validates every platform provider control without persisting sensitive data', () => {
    for (const token of ['checkout','subscriptions','webhookSignature','webhookIdempotency','invalidWebhookRejected','emailDelivery','sentryEventIngestion','sentryReleaseAndSourceMaps','distributedRateLimit','stripeProviderReachable','providerFailureClassification']) {
      expect(runner).toContain(token);
      expect(validator).toContain(token);
    }
    expect(runner).toContain('credentialsStored: false');
    expect(runner).toContain('responseBodiesStored: false');
    expect(runner).not.toContain('await response.text()');
  });

  it('binds every internal proof route to a dedicated token and exact deployed SHA', () => {
    expect(boundary).toContain("process.env.PLATFORM_PROOF_TOKEN");
    expect(boundary).toContain('validateBearerToken');
    expect(boundary).toContain('runtimeReleaseMetadata()');
    expect(boundary).toContain("request.headers.get('x-release-sha')");
    expect(boundary).toContain("error: 'release_sha_mismatch'");

    for (const source of [checkoutRoute, subscriptionsRoute, emailRoute, sentryRoute, rateLimitRoute]) {
      expect(source).toContain('authorizePlatformProofRequest');
      expect(source).toContain("export const runtime = 'nodejs'");
      expect(source).toContain("export const dynamic = 'force-dynamic'");
    }
  });

  it('keeps Stripe probes read-only and the synthetic webhook non-billable', () => {
    expect(checkoutRoute).toContain('checkout.sessions.list({ limit: 1 })');
    expect(subscriptionsRoute).toContain("subscriptions.list({ limit: 1, status: 'all' })");
    for (const source of [checkoutRoute, subscriptionsRoute]) {
      expect(source).not.toMatch(/\.create\(/);
      expect(source).not.toMatch(/\.update\(/);
      expect(source).not.toMatch(/\.del\(/);
    }

    expect(runner).toContain("type: 'checkout.session.completed'");
    expect(runner).toContain("mode: 'payment'");
    expect(runner).toContain('livemode,');
    expect(runner).not.toContain("type: 'customer.subscription.updated'");
  });

  it('uses bounded provider-specific synthetic probes', () => {
    expect(emailRoute).toContain("const RESEND_DELIVERY_TEST_RECIPIENT = 'delivered@resend.dev'");
    expect(emailRoute).not.toContain('request.json()');
    expect(emailRoute).toContain("provider !== 'resend'");

    expect(sentryRoute).toContain('reportError(new Error(PROOF_ERROR)');
    expect(sentryRoute).toContain("'x-sentry-release': authorization.releaseSha");

    expect(rateLimitRoute).toContain('checkDistributedRateLimit');
    expect(rateLimitRoute).toContain('limit: 5');
    expect(rateLimitRoute).toContain("failureMode: 'fail-closed'");
  });

  it('classifies authentication, rate limit, unavailable and rejected provider failures', () => {
    for (const token of ['authentication','rate_limit','provider_unavailable','request_rejected','retryable','publicCode']) expect(classifier).toContain(token);
  });
});
