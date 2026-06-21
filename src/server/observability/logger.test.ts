import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger, logSecurityEvent, sanitizeContext, STANDARD_SECURITY_EVENTS } from './logger';

describe('central observability logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts secrets, tokens, cookies and avoidable PII while keeping safe identifiers', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    logger.warn('security_denied', {
      requestId: 'req_123',
      organizationId: 'org_123',
      authorization: 'Bearer should-not-leak',
      cookie: 'sid=super-secret',
      email: 'person@example.com',
      nested: {
        refresh_token: 'refresh-secret',
        safe: 'ok',
      },
      safe: 'visible',
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(spy.mock.calls[0][0]));

    expect(payload.requestId).toBe('req_123');
    expect(payload.organizationId).toBe('org_123');
    expect(payload.context.authorization).toBe('[redacted]');
    expect(payload.context.cookie).toBe('[redacted]');
    expect(payload.context.email).toBe('[redacted]');
    expect(payload.context.nested.refresh_token).toBe('[redacted]');
    expect(payload.context.nested.safe).toBe('ok');
    expect(JSON.stringify(payload)).not.toContain('should-not-leak');
    expect(JSON.stringify(payload)).not.toContain('super-secret');
    expect(JSON.stringify(payload)).not.toContain('person@example.com');
  });

  it('redacts unsafe organization ids instead of logging untrusted tenant context', () => {
    expect(sanitizeContext({ organizationId: '../org_123', requestId: 'req_456' })).toEqual({
      organizationId: '[redacted]',
      requestId: 'req_456',
    });
  });

  it('exports the required standardized security events', () => {
    expect(STANDARD_SECURITY_EVENTS).toEqual([
      'security_denied',
      'rbac_denied',
      'origin_denied',
      'rate_limit_blocked',
      'step_up_failed',
      'webhook_failed',
      'upload_blocked',
      'rls_validation_failed',
      'audit_chain_invalid',
    ]);
  });

  it('logs standardized security events with request id', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    logSecurityEvent('rbac_denied', {
      requestId: 'req_rbac',
      organizationId: 'org_rbac',
      reason: 'missing_permission',
    });

    const payload = JSON.parse(String(spy.mock.calls[0][0]));
    expect(payload.event).toBe('rbac_denied');
    expect(payload.requestId).toBe('req_rbac');
    expect(payload.context.reason).toBe('missing_permission');
  });
});
