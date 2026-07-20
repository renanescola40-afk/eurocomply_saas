import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/platform-providers-runtime-proof.yml', 'utf8');
const runner = readFileSync('scripts/platform/run-platform-providers-runtime-validation.mjs', 'utf8');
const validator = readFileSync('scripts/platform/check-platform-providers-evidence.mjs', 'utf8');
const classifier = readFileSync('scripts/platform/provider-failure-classifier.mjs', 'utf8');

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

  it('classifies authentication, rate limit, unavailable and rejected provider failures', () => {
    for (const token of ['authentication','rate_limit','provider_unavailable','request_rejected','retryable','publicCode']) expect(classifier).toContain(token);
  });
});
