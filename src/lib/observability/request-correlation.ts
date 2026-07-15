export const REQUEST_ID_HEADER = 'x-request-id';
export const REQUEST_ID_PREFIX = 'req_';

const TRUSTED_REQUEST_ID_PATTERN = /^req_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isTrustedRequestId(value: unknown): value is string {
  return typeof value === 'string' && TRUSTED_REQUEST_ID_PATTERN.test(value);
}

export function createTrustedRequestId() {
  return `${REQUEST_ID_PREFIX}${globalThis.crypto.randomUUID()}`;
}

export function trustedRequestIdFromHeaders(headers: Headers) {
  const requestId = headers.get(REQUEST_ID_HEADER);
  if (!requestId) return 'req_unavailable';
  return isTrustedRequestId(requestId) ? requestId : 'req_invalid';
}

function requireTrustedRequestId(requestId: string) {
  if (!isTrustedRequestId(requestId)) {
    throw new TypeError('requestId must be an application-generated req_<UUID v4> value');
  }
}

export function buildCorrelatedRequestHeaders(headers: HeadersInit, requestId = createTrustedRequestId()) {
  requireTrustedRequestId(requestId);
  const correlatedHeaders = new Headers(headers);
  correlatedHeaders.set(REQUEST_ID_HEADER, requestId);
  return correlatedHeaders;
}

export function attachRequestIdHeader<TResponse extends Response>(response: TResponse, requestId: string) {
  requireTrustedRequestId(requestId);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}
