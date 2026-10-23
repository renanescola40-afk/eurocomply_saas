import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/security/api-guards', () => {
  class ApiSecurityError extends Error {
    code: string;
    status: number;
    constructor({ code, message, status }: { code: string; message: string; status: number }) {
      super(message);
      this.name = 'ApiSecurityError';
      this.code = code;
      this.status = status;
    }
  }
  return { ApiSecurityError };
});

import { ApiSecurityError } from '@/server/security/api-guards';
import { shouldReportRetentionExportError } from '@/server/security/retention-export-error-reporting';

describe('retention export error telemetry', () => {
  it('does not report an expected unauthenticated 401 as an application failure', () => {
    const error = new ApiSecurityError({
      code: 'unauthorized',
      message: 'Authentication required.',
      status: 401,
    });
    expect(shouldReportRetentionExportError(error)).toBe(false);
  });

  it('continues reporting unavailable security enforcement (503)', () => {
    const error = new ApiSecurityError({
      code: 'security_control_unavailable',
      message: 'Security control unavailable.',
      status: 503,
    });
    expect(shouldReportRetentionExportError(error)).toBe(true);
  });

  it('continues reporting unexpected application failures', () => {
    expect(shouldReportRetentionExportError(new Error('unexpected failure'))).toBe(true);
  });

  it('does not trust spoofed 401 fields on non-ApiSecurityError objects', () => {
    expect(shouldReportRetentionExportError({ code: 'unauthorized', status: 401 })).toBe(true);
  });

  it('does not suppress denial errors with non-401 status', () => {
    const error = new ApiSecurityError({
      code: 'permission_denied',
      message: 'Permission denied.',
      status: 403,
    });
    expect(shouldReportRetentionExportError(error)).toBe(true);
  });
});
