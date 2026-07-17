import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  classifyProviderFailure,
  providerConfigurationFailure,
  providerFailureContext,
} from '@/server/providers/failure';

const apiGuards = readFileSync('src/server/security/api-guards.ts', 'utf8');
const checkoutRoute = readFileSync('src/app/api/billing/checkout/route.ts', 'utf8');
const portalRoute = readFileSync('src/app/api/billing/portal/route.ts', 'utf8');
const recoveryRoute = readFileSync('src/app/api/auth/recovery/route.ts', 'utf8');
const emailSender = readFileSync('src/lib/email/server-sender.ts', 'utf8');

function expectSummary(
  error: ReturnType<typeof classifyProviderFailure>,
  expected: Partial<ReturnType<typeof error.toSafeSummary>>,
) {
  expect(error.toSafeSummary()).toEqual(expect.objectContaining(expected));
}

describe('provider failure classification', () => {
  it('distinguishes rate limits, timeouts, authentication, authorization and unavailability', () => {
    expectSummary(
      classifyProviderFailure('stripe', 'checkout_session_create', {
        type: 'StripeRateLimitError',
        code: 'rate_limit',
        statusCode: 429,
        message: 'sensitive provider message',
      }),
      {
        provider: 'stripe',
        kind: 'rate_limited',
        code: 'rate_limit',
        retryable: true,
        publicCode: 'provider_rate_limited',
        httpStatus: 503,
      },
    );

    expectSummary(
      classifyProviderFailure('resend', 'send_email', {
        name: 'TimeoutError',
        code: 'UND_ERR_CONNECT_TIMEOUT',
        message: 'request timed out after secret-token',
      }),
      {
        provider: 'resend',
        kind: 'timeout',
        code: 'und_err_connect_timeout',
        retryable: true,
        publicCode: 'provider_timeout',
        httpStatus: 504,
      },
    );

    expectSummary(
      classifyProviderFailure('stripe', 'customer_update', {
        type: 'authentication_error',
        statusCode: 401,
      }),
      {
        kind: 'authentication',
        retryable: false,
        publicCode: 'provider_authentication_failed',
      },
    );

    expectSummary(
      classifyProviderFailure('supabase', 'billing_profile_lookup', {
        code: 'insufficient_scope',
        status: 403,
      }),
      {
        kind: 'authorization',
        retryable: false,
        publicCode: 'provider_authorization_failed',
      },
    );

    expectSummary(
      classifyProviderFailure('supabase', 'password_recovery_request', {
        code: 'provider_unavailable',
        message: 'raw diagnostic',
      }),
      {
        kind: 'unavailable',
        retryable: true,
        publicCode: 'provider_unavailable',
        httpStatus: 503,
      },
    );
  });

  it('distinguishes conflicts, invalid requests and configuration failures', () => {
    expectSummary(
      classifyProviderFailure('supabase', 'membership_insert', {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      }),
      {
        kind: 'conflict',
        code: '23505',
        retryable: false,
        publicCode: 'provider_conflict',
        httpStatus: 409,
      },
    );

    expectSummary(
      classifyProviderFailure('stripe', 'checkout_session_create', {
        type: 'invalid_request_error',
        statusCode: 400,
      }),
      {
        kind: 'invalid_request',
        retryable: false,
        publicCode: 'provider_rejected_request',
        httpStatus: 502,
      },
    );

    const configuration = providerConfigurationFailure(
      'resend',
      'send_email',
      'missing_api_key',
    );
    expect(configuration.toSafeSummary()).toEqual({
      provider: 'resend',
      kind: 'configuration',
      code: 'missing_api_key',
      retryable: false,
      operation: 'send_email',
      publicCode: 'provider_configuration_unavailable',
      httpStatus: 503,
    });
  });

  it('never copies raw provider messages, credentials or payloads into safe summaries', () => {
    const rawSecret = 'sk_live_super_sensitive_provider_credential';
    const failure = classifyProviderFailure('stripe', 'checkout_session_create', {
      name: 'StripeConnectionError',
      code: 'api_connection_error',
      statusCode: 503,
      message: `provider failed with ${rawSecret}`,
      response: { status: 503 },
      payload: { authorization: `Bearer ${rawSecret}` },
    });

    expect(failure.message).toBe('stripe:checkout_session_create:unavailable');
    expect(JSON.stringify(failure.toSafeSummary())).not.toContain(rawSecret);
    expect(JSON.stringify(providerFailureContext(failure))).not.toContain(rawSecret);
    expect(failure.toSafeSummary()).not.toHaveProperty('message');
    expect(failure.toSafeSummary()).not.toHaveProperty('payload');
  });

  it('uses one central no-store API response contract for provider failures', () => {
    expect(apiGuards).toContain('if (isProviderFailureError(error))');
    expect(apiGuards).toContain("area: 'provider_failure'");
    expect(apiGuards).toContain('error: error.publicCode');
    expect(apiGuards).toContain('retryable: error.retryable');
    expect(apiGuards).toContain('{ status: error.httpStatus }');
    expect(apiGuards).not.toContain('error.providerCode, requestId');
    expect(apiGuards).not.toContain('error.message, requestId');
  });

  it('integrates the taxonomy into real Stripe, Resend and Supabase boundaries', () => {
    for (const operation of [
      'customer_update',
      'customer_create',
      'checkout_session_create',
      'checkout_session_expire',
    ]) {
      expect(checkoutRoute).toContain(`'${operation}'`);
    }
    expect(checkoutRoute).toContain("classifyProviderFailure('stripe'");
    expect(portalRoute).toContain("classifyProviderFailure('stripe', 'billing_portal_session_create'");
    expect(portalRoute).toContain("classifyProviderFailure('supabase', 'billing_profile_lookup'");
    expect(recoveryRoute).toContain("classifyProviderFailure('supabase', 'password_recovery_request'");
    expect(emailSender).toContain("classifyProviderFailure('resend', 'send_email'");
    expect(emailSender).toContain('if (!providerFailure.retryable || attempt >= attemptsToRun) break;');
    expect(emailSender).toContain('failure: configurationFailure.toSafeSummary()');
    expect(emailSender).not.toContain('data.error?.message ?');
  });
});
