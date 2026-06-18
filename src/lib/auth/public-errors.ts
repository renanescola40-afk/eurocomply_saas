export const PUBLIC_AUTH_ERROR_CODES = [
  'missing_oauth_code',
  'auth_configuration_unavailable',
  'auth_exchange_failed',
  'email_sign_in_failed',
] as const;

export type PublicAuthErrorCode = (typeof PUBLIC_AUTH_ERROR_CODES)[number];

const PUBLIC_AUTH_ERROR_CODE_SET = new Set<string>(PUBLIC_AUTH_ERROR_CODES);

export function isPublicAuthErrorCode(value: unknown): value is PublicAuthErrorCode {
  return typeof value === 'string' && PUBLIC_AUTH_ERROR_CODE_SET.has(value);
}

export function normalizePublicAuthErrorCode(
  value: unknown,
  fallback: PublicAuthErrorCode = 'auth_exchange_failed',
): PublicAuthErrorCode {
  return isPublicAuthErrorCode(value) ? value : fallback;
}
