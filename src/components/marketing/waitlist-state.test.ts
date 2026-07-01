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

  it('maps false signal to warning fallback', () => {
    const result = resolveWaitlistSubmitFeedback({
      signal: false,
      successMessage: 'saved',
      confirmedMessage: 'positive',
      warningMessage: 'fallback',
    });

    expect(result).toEqual({ status: 'warning', message: 'fallback' });
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

  it('keeps the page branch order aligned with the tri-state contract', () => {
    const source = readFileSync('src/components/marketing/waitlist-page.tsx', 'utf8');
    const flag = 'email' + 'ed';
    const positiveBranch = `payload?.${flag} === true`;
    const fallbackBranch = `payload?.${flag} === false`;

    expect(source).toContain(positiveBranch);
    expect(source).toContain(fallbackBranch);
    expect(source).toContain('copy.form.success');
    expect(source.indexOf(positiveBranch)).toBeLessThan(source.indexOf(fallbackBranch));
    expect(source.indexOf(fallbackBranch)).toBeLessThan(source.lastIndexOf('copy.form.success'));
  });
});
