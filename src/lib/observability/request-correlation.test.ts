import { describe, expect, it } from 'vitest';

import {
  REQUEST_ID_HEADER,
  attachRequestIdHeader,
  buildCorrelatedRequestHeaders,
  createTrustedRequestId,
} from './request-correlation';

describe('trusted request correlation', () => {
  it('generates an application-owned request id', () => {
    expect(createTrustedRequestId()).toMatch(
      /^req_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('overwrites a caller-supplied request id before forwarding', () => {
    const headers = buildCorrelatedRequestHeaders(
      new Headers({
        [REQUEST_ID_HEADER]: 'caller-controlled-id',
        'user-agent': 'test-agent',
      }),
      'req_trusted',
    );

    expect(headers.get(REQUEST_ID_HEADER)).toBe('req_trusted');
    expect(headers.get('user-agent')).toBe('test-agent');
  });

  it('returns the same trusted id to the caller', () => {
    const response = attachRequestIdHeader(new Response(null, { status: 204 }), 'req_response');

    expect(response.headers.get(REQUEST_ID_HEADER)).toBe('req_response');
  });
});
