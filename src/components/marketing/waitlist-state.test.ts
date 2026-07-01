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
});
