import { describe, expect, it } from 'vitest';

import { localizedInvitationEmail } from '@/lib/email/localized-invitation';

const locales = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;

describe('Article 14 invitation privacy disclosure', () => {
  it('discloses the indirect source and privacy notice in the first invitation communication', () => {
    for (const locale of locales) {
      const email = localizedInvitationEmail({
        organizationName: 'Acme Europe',
        role: 'viewer',
        inviteUrl: `https://www.risckcomply.com/${locale}/invite/token-123`,
        locale,
      });

      expect(email.text).toContain('Acme Europe');
      expect(email.text).toContain(`https://www.risckcomply.com/${locale}/privacy`);
      expect(email.html).toContain(`href="https://www.risckcomply.com/${locale}/privacy"`);
      expect(email.html).not.toContain('token-123</a></div><div');
    }
  });

  it('does not reflect an unsafe scheme into the privacy URL', () => {
    const email = localizedInvitationEmail({
      organizationName: 'Acme Europe',
      role: 'viewer',
      inviteUrl: 'javascript:alert(1)',
      locale: 'pt',
    });

    expect(email.text).toContain('/pt/privacy');
    expect(email.html).not.toContain('javascript:');
  });

  it('does not reflect an untrusted HTTPS origin into the privacy URL', () => {
    const email = localizedInvitationEmail({
      organizationName: 'Acme Europe',
      role: 'viewer',
      inviteUrl: 'https://attacker.example/pt/invite/token-123',
      locale: 'pt',
    });

    expect(email.text).toContain('Informação de privacidade: /pt/privacy');
    expect(email.html).toContain('href="/pt/privacy"');
    expect(email.html).not.toContain('attacker.example/pt/privacy');
  });

  it('accepts trusted Risck Comply subdomains for the privacy origin', () => {
    const email = localizedInvitationEmail({
      organizationName: 'Acme Europe',
      role: 'viewer',
      inviteUrl: 'https://app.risckcomply.com/en/invite/token-123',
      locale: 'en',
    });

    expect(email.text).toContain('https://app.risckcomply.com/en/privacy');
  });

  it('falls back to the English privacy route for an unsupported locale', () => {
    const email = localizedInvitationEmail({
      organizationName: 'Acme Europe',
      role: 'viewer',
      inviteUrl: 'https://www.risckcomply.com/xx/invite/token-123',
      locale: 'xx',
    });

    expect(email.text).toContain('https://www.risckcomply.com/en/privacy');
  });
});
