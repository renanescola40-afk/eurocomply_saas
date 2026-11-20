import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  isEffectivePublicLegalPublication: vi.fn(() => false),
  checkDistributedRateLimit: vi.fn(),
  tryCreateAdminClient: vi.fn(),
  sendPrelaunchWaitlistEmail: vi.fn(),
  sendInternalWaitlistNotification: vi.fn(),
}));

vi.mock('@/lib/legal/public-contract', () => ({
  PUBLIC_PRIVACY_PUBLICATION: { version: '0.2-review', state: 'review', effectiveDate: null },
  isEffectivePublicLegalPublication: mocks.isEffectivePublicLegalPublication,
}));
vi.mock('@/lib/security/rate-limit', () => ({ checkDistributedRateLimit: mocks.checkDistributedRateLimit }));
vi.mock('@/lib/supabase/admin', () => ({ tryCreateAdminClient: mocks.tryCreateAdminClient }));
vi.mock('@/lib/email/prelaunch-waitlist', () => ({
  sendPrelaunchWaitlistEmail: mocks.sendPrelaunchWaitlistEmail,
  sendInternalWaitlistNotification: mocks.sendInternalWaitlistNotification,
}));

import { POST } from './route';

describe('legacy waitlist privacy gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isEffectivePublicLegalPublication.mockReturnValue(false);
  });

  afterEach(() => {
  });

  it('rejects a same-origin contact request without persisting or emailing while the notice is a draft', async () => {
    const request = new NextRequest('https://example.test/api/prelaunch', {
      method: 'POST',
      headers: { origin: 'https://example.test', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'synthetic@example.test', companyName: 'Example', consentToContact: true }),
    });
    const response = await POST(request);

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ error: 'Requests are temporarily unavailable.' });
    expect(mocks.checkDistributedRateLimit).not.toHaveBeenCalled();
    expect(mocks.tryCreateAdminClient).not.toHaveBeenCalled();
    expect(mocks.sendPrelaunchWaitlistEmail).not.toHaveBeenCalled();
    expect(mocks.sendInternalWaitlistNotification).not.toHaveBeenCalled();
  });
  it('fails closed without durable storage or confirmed mailbox delivery, even when privacy is effective', async () => {
    mocks.isEffectivePublicLegalPublication.mockReturnValue(true);
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.tryCreateAdminClient.mockReturnValue(null);
    mocks.sendInternalWaitlistNotification.mockResolvedValue({
      sent: false, provider: 'console', status: 'failed', attempts: 0,
    });
    vi.stubEnv('RISCK_COMPLY_LEAD_WEBHOOK_URL', '');

    const response = await POST(new NextRequest('https://example.test/api/prelaunch', {
      method: 'POST',
      headers: { origin: 'https://example.test', 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'synthetic@example.test', companyName: 'Example', role: 'Compliance lead',
        consentToContact: true,
      }),
    }));

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({
      error: 'Requests are temporarily unavailable. Please contact sales directly.',
    });
    expect(mocks.sendInternalWaitlistNotification).toHaveBeenCalledTimes(1);
    expect(mocks.sendPrelaunchWaitlistEmail).not.toHaveBeenCalled();
  });

  it('accepts degraded capture only when the internal mailbox confirms delivery', async () => {
    mocks.isEffectivePublicLegalPublication.mockReturnValue(true);
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true });
    mocks.tryCreateAdminClient.mockReturnValue(null);
    mocks.sendInternalWaitlistNotification.mockResolvedValue({
      sent: true, provider: 'test', status: 'sent', attempts: 1,
    });
    vi.stubEnv('RISCK_COMPLY_LEAD_WEBHOOK_URL', '');

    const response = await POST(new NextRequest('https://example.test/api/prelaunch', {
      method: 'POST',
      headers: { origin: 'https://example.test', 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'synthetic@example.test', companyName: 'Example', role: 'Compliance lead',
        consentToContact: true,
      }),
    }));

    expect(response.status).toBe(202);
    expect((await response.json()).status).toBe('received');
    expect(mocks.sendInternalWaitlistNotification).toHaveBeenCalledTimes(1);
    expect(mocks.sendPrelaunchWaitlistEmail).not.toHaveBeenCalled();
  });

});
