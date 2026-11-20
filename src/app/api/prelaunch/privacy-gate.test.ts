import { describe, expect, it, vi } from 'vitest';

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
  it('rejects a same-origin contact request without persisting or emailing while the notice is a draft', async () => {
    const request = new Request('https://example.test/api/prelaunch', {
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
});
