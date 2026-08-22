import { afterEach, describe, expect, it, vi } from 'vitest';

import { transactionalEmailReadinessCheck } from './route';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('transactional email readiness', () => {
  it('does not require provider configuration when the protected delivery guard is disabled', () => {
    vi.stubEnv('REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY', '');
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('EMAIL_FROM', '');

    expect(transactionalEmailReadinessCheck()).toEqual({
      required: false,
      configured: true,
      apiKeyConfigured: false,
      senderConfigured: false,
    });
  });

  it('fails closed when protected transactional delivery is required but the Resend key is missing', () => {
    vi.stubEnv('REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY', 'true');
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('EMAIL_FROM', 'RISCK COMPLY <no-reply@risckcomply.app>');

    expect(transactionalEmailReadinessCheck()).toEqual({
      required: true,
      configured: false,
      apiKeyConfigured: false,
      senderConfigured: true,
    });
  });

  it('fails closed when protected transactional delivery is required but the sender is missing', () => {
    vi.stubEnv('REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY', 'true');
    vi.stubEnv('RESEND_API_KEY', 're_test_value_must_never_be_returned');
    vi.stubEnv('EMAIL_FROM', '');

    expect(transactionalEmailReadinessCheck()).toEqual({
      required: true,
      configured: false,
      apiKeyConfigured: true,
      senderConfigured: false,
    });
  });

  it('reports only booleans when the protected Resend binding is complete', () => {
    const apiKey = 're_test_value_must_never_be_returned';
    const sender = 'RISCK COMPLY <no-reply@risckcomply.app>';
    vi.stubEnv('REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY', 'true');
    vi.stubEnv('RESEND_API_KEY', apiKey);
    vi.stubEnv('EMAIL_FROM', sender);

    const readiness = transactionalEmailReadinessCheck();
    const serialized = JSON.stringify(readiness);

    expect(readiness).toEqual({
      required: true,
      configured: true,
      apiKeyConfigured: true,
      senderConfigured: true,
    });
    expect(serialized).not.toContain(apiKey);
    expect(serialized).not.toContain(sender);
    expect(serialized).not.toContain('RESEND_API_KEY');
    expect(serialized).not.toContain('EMAIL_FROM');
  });
});
