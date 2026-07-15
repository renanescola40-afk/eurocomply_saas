export const REQUEST_ID_HEADER = 'x-request-id';
export const REQUEST_ID_PREFIX = 'req_';

export function createTrustedRequestId() {
  return `${REQUEST_ID_PREFIX}${globalThis.crypto.randomUUID()}`;
}

export function buildCorrelatedRequestHeaders(headers: HeadersInit, requestId = createTrustedRequestId()) {
  const correlatedHeaders = new Headers(headers);
  correlatedHeaders.set(REQUEST_ID_HEADER, requestId);
  return correlatedHeaders;
}

export function attachRequestIdHeader<TResponse extends Response>(response: TResponse, requestId: string) {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}
