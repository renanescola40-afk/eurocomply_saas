import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(async (_input: unknown) => ({
    sent: true,
    provider: 'test',
    status: 'sent',
    attempts: 1,
  })),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/email/client', () => ({ sendEmail: mocks.sendEmail }));

import { sendPrelaunchWaitlistEmail } from './prelaunch-waitlist';

const input = {
  to: 'synthetic@example.test',
  companyName: 'Synthetic Company',
  role: 'Compliance Lead',
  locale: 'en',
  joinedAt: '2026-11-20T12:00:00Z',
  // Deliberately supply an expired legacy target to prove that it is not advertised.
  launchAt: '2026-08-01T07:00:00+01:00',
  waitlistUrl: 'https://www.risckcomply.com/en',
};

function sentEmail() {
  const call = mocks.sendEmail.mock.calls.at(-1);
  if (!call) throw new Error('Expected the email provider to be called');
  return call[0] as {
    subject: string;
    html: string;
    text: string;
    to: string;
    idempotencyKey: string;
  };
}

describe('prelaunch waitlist customer email claims', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('acknowledges interest without promising a priority place or an expired launch', async () => {
    await sendPrelaunchWaitlistEmail(input);
    const email = sentEmail();

    expect(email.to).toBe('synthetic@example.test');
    expect(email.subject).toContain('received your request');
    expect(email.idempotencyKey).toBe('prelaunch-waitlist:synthetic@example.test');
    expect(email.html).toContain('Our commercial team will review your request');
    expect(email.text).toContain('Received:');
    expect(email.html + email.text + email.subject).not.toMatch(
      /1 August 2026|2026-08-01|time remaining|priority (?:place|access)|official opening/i,
    );
  });

  it('escapes untrusted business and role fields in the generated HTML', async () => {
    await sendPrelaunchWaitlistEmail({
      ...input,
      companyName: '<script>alert(1)</script>',
      role: 'Owner & Compliance',
    });
    const email = sentEmail();

    expect(email.html).not.toContain('<script>alert(1)</script>');
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(email.html).toContain('Owner &amp; Compliance');
  });
});
