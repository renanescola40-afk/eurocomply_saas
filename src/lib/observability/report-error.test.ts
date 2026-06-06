import { describe, expect, it, vi } from 'vitest';
import { reportError } from './report-error';

describe('reportError', () => {
  it('returns the error and safe context', () => {
    const error = new Error('Something failed');

    const result = reportError(error, {
      organizationId: 'org_123',
      retryable: false,
      count: 2,
      empty: null,
    });

    expect(result.error).toBe(error);
    expect(result.context).toEqual({
      organizationId: 'org_123',
      retryable: false,
      count: 2,
      empty: null,
    });
  });

  it('logs in non-production environments', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    reportError(new Error('Local failure'), { area: 'test' });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
