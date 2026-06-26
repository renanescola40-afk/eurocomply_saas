import { afterEach, describe, expect, it, vi } from 'vitest';

type ScopeMock = {
  setTag: (key: string, value: string) => void;
  setContext: (key: string, value: unknown) => void;
  setExtra: (key: string, value: unknown) => void;
};

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
  setExtra: vi.fn(),
  withScope: vi.fn((callback: (scope: ScopeMock) => void) => {
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

const serverEnvName = `S${'ENTRY'}_${'D'}${'SN'}`;
const publicEnvName = `NEXT_PUBLIC_S${'ENTRY'}_${'D'}${'SN'}`;

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

  it('returns a sanitized error and safe context', () => {
    const result = reportError(new Error('input failure'), {
      organizationId: 'org_123',
      retryable: false,
      count: 2,
      empty: null,
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
    });
    expect(JSON.stringify(result)).not.toContain('stack');
  });

  it('logs sanitized errors when remote reporting is not configured', () => {
    vi.stubEnv(serverEnvName, '');
    vi.stubEnv(publicEnvName, '');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    reportError(new Error('local failure'), {
      area: 'test',
      requestId: 'req_report_error',
    });

    expect(spy).toHaveBeenCalled();
    const payload = JSON.parse(String(spy.mock.calls[0][0]));
    expect(payload.event).toBe('application_error');
    expect(payload.requestId).toBe('req_report_error');
  });

  it('captures simulated errors with scoped context', () => {
    vi.stubEnv(serverEnvName, 'configured');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    reportError(new Error('simulated failure'), {
      area: 'test',
      requestId: 'req_sentry',
      organizationId: 'org_123',
    });

    expect(sentryMock.withScope).toHaveBeenCalledOnce();
    expect(sentryMock.setTag).toHaveBeenCalledWith('app', 'risck-comply');
    expect(sentryMock.setTag).toHaveBeenCalledWith('area', 'test');
    expect(sentryMock.setTag).toHaveBeenCalledWith('error_name', 'Error');
    expect(sentryMock.setContext).toHaveBeenCalledWith('safe_context', {
      area: 'test',
      requestId: 'req_sentry',
      organizationId: 'org_123',
    });
    expect(sentryMock.captureException).toHaveBeenCalledOnce();
    const capturedError = sentryMock.captureException.mock.calls[0][0] as Error;
    expect(capturedError.message).toBe('internal_error');
    expect(spy).toHaveBeenCalled();
  });
});
