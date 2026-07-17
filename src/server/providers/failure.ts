import 'server-only';

export const PROVIDER_FAILURE_KINDS = [
  'configuration',
  'authentication',
  'authorization',
  'rate_limited',
  'timeout',
  'unavailable',
  'invalid_request',
  'conflict',
  'rejected',
  'unknown',
] as const;

export type ProviderFailureKind = (typeof PROVIDER_FAILURE_KINDS)[number];

export type ProviderName =
  | 'stripe'
  | 'resend'
  | 'supabase'
  | 'sentry'
  | 'upstash'
  | 'cloudmersive'
  | 'google_oauth'
  | 'github'
  | 'unknown';

export type ProviderFailureSummary = {
  provider: ProviderName;
  kind: ProviderFailureKind;
  code: string;
  retryable: boolean;
  operation: string;
  publicCode: string;
  httpStatus: number;
};

type ProviderFailureInput = {
  provider: ProviderName;
  kind: ProviderFailureKind;
  providerCode?: string | null;
  operation: string;
  retryable?: boolean;
  httpStatus?: number;
  cause?: unknown;
};

type ProviderErrorLike = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  type?: unknown;
  status?: unknown;
  statusCode?: unknown;
  response?: { status?: unknown } | null;
  raw?: { code?: unknown; type?: unknown; statusCode?: unknown } | null;
};

const SAFE_TOKEN = /[^a-z0-9_.-]+/g;

function normalizeToken(value: unknown, fallback: string) {
  const token = typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().toLowerCase().replace(SAFE_TOKEN, '_').replace(/^_+|_+$/g, '')
    : '';
  return (token || fallback).slice(0, 80);
}

function readStatus(error: ProviderErrorLike) {
  const candidates = [error.status, error.statusCode, error.response?.status, error.raw?.statusCode];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isInteger(value) && value >= 100 && value <= 599) return value;
  }
  return null;
}

function sourceTokens(error: ProviderErrorLike) {
  return [
    error.name,
    error.code,
    error.type,
    error.raw?.code,
    error.raw?.type,
    error.message,
  ]
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .map((value) => String(value).toLowerCase())
    .join(' ');
}

function containsAny(source: string, tokens: string[]) {
  return tokens.some((token) => source.includes(token));
}

function defaultsFor(kind: ProviderFailureKind) {
  switch (kind) {
    case 'configuration':
      return { retryable: false, httpStatus: 503, publicCode: 'provider_configuration_unavailable' };
    case 'authentication':
      return { retryable: false, httpStatus: 502, publicCode: 'provider_authentication_failed' };
    case 'authorization':
      return { retryable: false, httpStatus: 502, publicCode: 'provider_authorization_failed' };
    case 'rate_limited':
      return { retryable: true, httpStatus: 503, publicCode: 'provider_rate_limited' };
    case 'timeout':
      return { retryable: true, httpStatus: 504, publicCode: 'provider_timeout' };
    case 'unavailable':
      return { retryable: true, httpStatus: 503, publicCode: 'provider_unavailable' };
    case 'invalid_request':
      return { retryable: false, httpStatus: 502, publicCode: 'provider_rejected_request' };
    case 'conflict':
      return { retryable: false, httpStatus: 409, publicCode: 'provider_conflict' };
    case 'rejected':
      return { retryable: false, httpStatus: 502, publicCode: 'provider_rejected' };
    default:
      return { retryable: false, httpStatus: 502, publicCode: 'provider_failure' };
  }
}

function inferKind(error: ProviderErrorLike): ProviderFailureKind {
  const status = readStatus(error);
  const tokens = sourceTokens(error);

  if (
    containsAny(tokens, [
      'missing_secret',
      'missing_api_key',
      'not configured',
      'configuration',
      'required environment',
      'required env',
    ])
  ) {
    return 'configuration';
  }

  if (status === 429 || containsAny(tokens, ['rate_limit', 'rate limit', 'too_many_requests', 'too many requests'])) {
    return 'rate_limited';
  }

  if (
    containsAny(tokens, [
      'timeout',
      'timed out',
      'aborterror',
      'timeouterror',
      'etimedout',
      'und_err_connect_timeout',
    ])
  ) {
    return 'timeout';
  }

  if (status === 401 || containsAny(tokens, ['authentication_error', 'authentication failed', 'invalid api key', 'invalid_api_key'])) {
    return 'authentication';
  }

  if (status === 403 || containsAny(tokens, ['permission_error', 'permission denied', 'forbidden', 'insufficient_scope'])) {
    return 'authorization';
  }

  if (
    status === 409 ||
    containsAny(tokens, ['idempotency_error', 'already exists', 'duplicate key', 'unique_violation', '23505'])
  ) {
    return 'conflict';
  }

  if (
    status === 400 ||
    status === 404 ||
    status === 422 ||
    containsAny(tokens, ['invalid_request', 'validation_error', 'validation failed', 'bad request'])
  ) {
    return 'invalid_request';
  }

  if (
    (status !== null && status >= 500) ||
    containsAny(tokens, [
      'provider_unavailable',
      'api_connection_error',
      'connection error',
      'connection reset',
      'econnreset',
      'econnrefused',
      'enotfound',
      'fetch failed',
      'network error',
      'service unavailable',
      'temporarily unavailable',
    ])
  ) {
    return 'unavailable';
  }

  if (status !== null && status >= 400) return 'rejected';
  return 'unknown';
}

function inferProviderCode(error: ProviderErrorLike, kind: ProviderFailureKind) {
  const candidate = error.code ?? error.type ?? error.raw?.code ?? error.raw?.type ?? error.name;
  return normalizeToken(candidate, kind);
}

export class ProviderFailureError extends Error {
  readonly provider: ProviderName;
  readonly kind: ProviderFailureKind;
  readonly providerCode: string;
  readonly operation: string;
  readonly retryable: boolean;
  readonly publicCode: string;
  readonly httpStatus: number;

  constructor(input: ProviderFailureInput) {
    const defaults = defaultsFor(input.kind);
    const providerCode = normalizeToken(input.providerCode, input.kind);
    const operation = normalizeToken(input.operation, 'unknown_operation');
    super(`${input.provider}:${operation}:${input.kind}`, { cause: input.cause });
    this.name = 'ProviderFailureError';
    this.provider = input.provider;
    this.kind = input.kind;
    this.providerCode = providerCode;
    this.operation = operation;
    this.retryable = input.retryable ?? defaults.retryable;
    this.publicCode = defaults.publicCode;
    this.httpStatus = input.httpStatus ?? defaults.httpStatus;
  }

  toSafeSummary(): ProviderFailureSummary {
    return {
      provider: this.provider,
      kind: this.kind,
      code: this.providerCode,
      retryable: this.retryable,
      operation: this.operation,
      publicCode: this.publicCode,
      httpStatus: this.httpStatus,
    };
  }
}

export function classifyProviderFailure(
  provider: ProviderName,
  operation: string,
  error: unknown,
): ProviderFailureError {
  if (error instanceof ProviderFailureError) return error;

  const candidate = error && typeof error === 'object' ? (error as ProviderErrorLike) : {};
  const kind = inferKind(candidate);
  return new ProviderFailureError({
    provider,
    operation,
    kind,
    providerCode: inferProviderCode(candidate, kind),
    cause: error,
  });
}

export function providerConfigurationFailure(
  provider: ProviderName,
  operation: string,
  providerCode: string,
) {
  return new ProviderFailureError({
    provider,
    operation,
    kind: 'configuration',
    providerCode,
  });
}

export function isProviderFailureError(error: unknown): error is ProviderFailureError {
  return error instanceof ProviderFailureError;
}

export function providerFailureContext(error: ProviderFailureError) {
  const summary = error.toSafeSummary();
  return {
    provider: summary.provider,
    providerFailureKind: summary.kind,
    providerFailureCode: summary.code,
    providerOperation: summary.operation,
    retryable: summary.retryable,
    providerHttpStatus: summary.httpStatus,
  };
}
