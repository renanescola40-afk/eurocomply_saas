import { describe, expect, it } from 'vitest';

import {
  REQUEST_ID_HEADER,
  attachRequestIdHeader,
  buildCorrelatedRequestHeaders,
  createTrustedRequestId,
  isTrustedRequestId,
  trustedRequestIdFromHeaders,
} from './request-correlation';

const TRUSTED_REQUEST_ID = 'req_123e4567-e89b-42d3-a456-426614174000';

describe('trusted request correlation', () => {
  it('generates an application-owned request id', () => {
    const requestId = createTrustedRequestId();

    expect(requestId).toMatch(
      /^req_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(isTrustedRequestId(requestId)).toBe(true);
  });

  it('overwrites a caller-supplied request id before forwarding', () => {
    const headers = buildCorrelatedRequestHeaders(
      new Headers({
        [REQUEST_ID_HEADER]: 'caller-controlled-id',
        'user-agent': 'test-agent',
      }),
      TRUSTED_REQUEST_ID,
    );

    expect(headers.get(REQUEST_ID_HEADER)).toBe(TRUSTED_REQUEST_ID);
    expect(headers.get('user-agent')).toBe('test-agent');
  });

  it('returns the same trusted id to the caller', () => {
    const response = attachRequestIdHeader(new Response(null, { status: 204 }), TRUSTED_REQUEST_ID);

    expect(response.headers.get(REQUEST_ID_HEADER)).toBe(TRUSTED_REQUEST_ID);
  });

  it('accepts only the application-owned header format for audit correlation', () => {
    expect(trustedRequestIdFromHeaders(new Headers({ [REQUEST_ID_HEADER]: TRUSTED_REQUEST_ID }))).toBe(
      TRUSTED_REQUEST_ID,
    );
    expect(trustedRequestIdFromHeaders(new Headers({ [REQUEST_ID_HEADER]: 'caller-controlled-id' }))).toBe(
      'req_invalid',
    );
    expect(trustedRequestIdFromHeaders(new Headers({ 'x-correlation-id': TRUSTED_REQUEST_ID }))).toBe(
      'req_unavailable',
    );
    expect(trustedRequestIdFromHeaders(new Headers({ 'x-vercel-id': TRUSTED_REQUEST_ID }))).toBe(
      'req_unavailable',
    );
  });

  it('fails closed when internal callers try to forward an invalid id', () => {
    expect(() => buildCorrelatedRequestHeaders(new Headers(), 'caller-controlled-id')).toThrow(TypeError);
    expect(() => attachRequestIdHeader(new Response(null), 'req_invalid')).toThrow(TypeError);
  });
});
