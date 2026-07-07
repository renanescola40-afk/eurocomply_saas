import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { resolveWaitlistSubmitFeedback } from '@/components/marketing/waitlist-state';

describe('waitlist state resolver', () => {
  it('maps true signal to positive success', () => {
    const result = resolveWaitlistSubmitFeedback({
      signal: true,
      successMessage: 'saved',
      confirmedMessage: 'positive',
      warningMessage: 'fallback',
    });

    expect(result).toEqual({ status: 'success', message: 'positive' });
  });

  it('keeps a saved submission successful when confirmation is unavailable', () => {
    const result = resolveWaitlistSubmitFeedback({
      signal: false,
      successMessage: 'saved',
      confirmedMessage: 'positive',
      warningMessage: 'fallback',
    });

    expect(result).toEqual({ status: 'success', message: 'saved' });
  });

  it('maps missing signal to neutral success', () => {
    const result = resolveWaitlistSubmitFeedback({
      signal: undefined,
      successMessage: 'saved',
      confirmedMessage: 'positive',
      warningMessage: 'fallback',
    });

    expect(result).toEqual({ status: 'success', message: 'saved' });
  });

  it('wires the waitlist client boundary through the shared response-state resolver and honeypot payload', () => {
    const source = readFileSync('src/components/marketing/waitlist-interactions.tsx', 'utf8');
    const flag = 'email' + 'ed';

    expect(source).toContain("import { resolveWaitlistSubmitFeedback } from '@/components/marketing/waitlist-state';");
    expect(source).toContain('const [website, setWebsite] = useState');
    expect(source).toContain('body: JSON.stringify({ companyName, email, role, website, locale: activeLocale, consentToContact: true })');
    expect(source).toContain('name="website"');
    expect(source).toContain('const feedback = resolveWaitlistSubmitFeedback({');
    expect(source).toContain(`signal: payload?.${flag}`);
    expect(source).toContain('successMessage: copy.form.success');
    expect(source).toContain('confirmedMessage: copy.form.emailSuccess');
    expect(source).toContain('warningMessage: emailWarningMessage(activeLocale, payload, commercialEmail)');
    expect(source).toContain('setMessage(feedback.message)');
    expect(source).toContain('setStatus(feedback.status)');
  });
});
