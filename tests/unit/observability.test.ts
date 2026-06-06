import { describe, expect, it } from 'vitest';
import { sanitizeContext } from '@/lib/observability';

describe('sanitizeContext', () => {
  it('redacts sensitive keys', () => {
    const sanitized = sanitizeContext({
      authorization: 'Bearer secret',
      cookie: 'session=value',
      email: 'person@example.com',
      organizationId: 'org_123',
    });

    expect(sanitized).toEqual({
      authorization: '[redacted]',
      cookie: '[redacted]',
      email: '[redacted]',
      organizationId: 'org_123',
    });
  });

  it('truncates long strings and sanitizes nested objects', () => {
    const sanitized = sanitizeContext({
      message: 'x'.repeat(200),
      nested: {
        token: 'secret-token',
        safe: 'ok',
      },
    });

    expect(String(sanitized.message)).toHaveLength(161);
    expect(sanitized.nested).toEqual({ token: '[redacted]', safe: 'ok' });
  });
});
