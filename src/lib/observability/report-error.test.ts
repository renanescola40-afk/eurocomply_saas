import { afterEach, describe, expect, it, vi } from 'vitest';

type MockSentryScope = {
  setTag: (key: string, value: string) => void;
  setContext: (key: string, value: unknown) => void;
  setExtra: (key: string, value: unknown) => void;
};

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
  setExtra: vi.fn(),
  withScope: vi.fn((callback: (scope: MockSentryScope) => void) => {
    callback({
      setTag: sentryMock.setTag,
      setContext: sentryMock.setContext,
      setExtra: sentryMock.setExtra,
    });
  }),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: sentryMock.captureException,
  withScope: sentryMock.withScope,
}));

import { reportError } from './report-error';

describe('reportError', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    sentryMock.captureException.mockReset();
    sentryMock.setTag.mockReset();
    sentryMock.setContext.mockReset();
    sentryMock.setExtra.mockReset();
    sentryMock.withScope.mockClear();
  });

  it('returns the sanitized error and safe context', () => {
    const result = reportError(new Error('input failure'), {
      organizationId: 'org_123',
      retryable: false,
      count: 2,
      empty: null,
      token: 'private-value',
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
    expect(JSON.stringify(result)).not.toContain('private-value');
    expect(JSON.stringify(result)).not.toContain('stack');
  });

  it('logs sanitized errors when Sentry is not configured', () => {
    vi.stubEnv('SENTRY_DSN', '');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    reportError(new Error('local failure'), {
      area: 'test',
      password: 'private-value',
      requestId: 'req_report_error',
    });

    expect(spy).toHaveBeenCalled();
    const payload = JSON.parse(String(spy.mock.calls[0][0]));
    expect(payload.event).toBe('application_error');
    expect(payload.requestId).toBe('req_report_error');
    expect(JSON.stringify(payload)).not.toContain('private-value');
  });

  it('captures simulated errors in Sentry with sanitized scoped context', () => {
    vi.stubEnv('SENTRY_DSN', 'configured');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    reportError(new Error('simulated failure'), {
      area: 'test',
      requestId: 'req_sentry',
      organizationId: 'org_123',
      password: 'private-value',
    });

    expect(sentryMock.withScope).toHaveBeenCalledOnce();
    expect(sentryMock.setTag).toHaveBeenCalledWith('app', 'risck-comply');
    expect(sentryMock.setTag).toHaveBeenCalledWith('area', 'test');
    expect(sentryMock.setContext).toHaveBeenCalledWith('safe_context', {
      area: 'test',
      requestId: 'req_sentry',
      organizationId: 'org_123',
      password: '[redacted]',
    });
    expect(sentryMock.captureException).toHaveBeenCalledOnce();
    const capturedError = sentryMock.captureException.mock.calls[0][0] as Error;
    expect(capturedError.message).toBe('internal_error');
    expect(spy).toHaveBeenCalled();
  });

  it('preserves the safe smoke test message for Sentry validation', () => {
    vi.stubEnv('SENTRY_DSN', 'configured');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    reportError(new Error('risck_comply_observability_smoke_test'), {
      area: 'observability_smoke',
      requestId: 'req_smoke',
      smokeTest: true,
    });

    const capturedError = sentryMock.captureException.mock.calls[0][0] as Error;
    expect(capturedError.message).toBe('risck_comply_observability_smoke_test');
    expect(sentryMock.setTag).toHaveBeenCalledWith('area', 'observability_smoke');
  });
});
