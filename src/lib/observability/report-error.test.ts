import { afterEach, describe, expect, it, vi } from 'vitest';

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: sentryMock.captureException,
}));

import { reportError } from './report-error';

describe('reportError', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    sentryMock.captureException.mockReset();
  });

  it('returns the sanitized error and safe context', () => {
    const error = new Error('Something failed with token=do-not-leak');

    const result = reportError(error, {
      organizationId: 'org_123',
      retryable: false,
      count: 2,
      empty: null,
      token: 'do-not-leak',
    });

    expect(result.error).toEqual({
      name: 'Error',
      code: 'Error',
      message: 'internal_error',
    });
    expect(result.context).toEqual({
      organizationId: 'org_123',
      retryable: false,
      count: 2,
      empty: null,
      token: '[redacted]',
    });
    expect(JSON.stringify(result)).not.toContain('do-not-leak');
    expect(JSON.stringify(result)).not.toContain('stack');
  });

  it('logs sanitized errors when Sentry is not configured', () => {
    vi.stubEnv('SENTRY_DSN', '');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    reportError(new Error('Local failure with password=hidden'), {
      area: 'test',
      password: 'hidden',
      requestId: 'req_report_error',
    });

    expect(spy).toHaveBeenCalled();
    const payload = JSON.parse(String(spy.mock.calls[0][0]));
    expect(payload.event).toBe('application_error');
    expect(payload.requestId).toBe('req_report_error');
    expect(JSON.stringify(payload)).not.toContain('password=hidden');
    expect(JSON.stringify(payload)).not.toContain('hidden');
  });

  it('captures simulated errors in Sentry with sanitized extra context', () => {
    vi.stubEnv('SENTRY_DSN', 'https://public@example.ingest.sentry.io/1');
    const error = new Error('Simulated sensitive failure');

    reportError(error, {
      requestId: 'req_sentry',
      organizationId: 'org_123',
      authorization: 'Bearer should-not-leak',
    });

    expect(sentryMock.captureException).toHaveBeenCalledWith(error, {
      extra: {
        requestId: 'req_sentry',
        organizationId: 'org_123',
        authorization: '[redacted]',
      },
    });
  });
});
