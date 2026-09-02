import 'server-only';

import { randomBytes, timingSafeEqual } from 'node:crypto';

import { LINKEDIN_MARKETING_REQUIRED_SCOPES } from '@/lib/marketing/linkedin-connection';

const LINKEDIN_AUTHORIZATION_ENDPOINT = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_ACCESS_TOKEN_ENDPOINT = 'https://www.linkedin.com/oauth/v2/accessToken';
const DEFAULT_REDIRECT_URI = 'https://www.risckcomply.com/api/platform/marketing/linkedin/oauth/callback';

export const LINKEDIN_OAUTH_STATE_COOKIE = '__Host-risck-linkedin-oauth-state';
export const LINKEDIN_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export type LinkedInOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type LinkedInOAuthTokenExchange = {
  accessToken: string;
  expiresIn: number | null;
  refreshToken: string | null;
  refreshTokenExpiresIn: number | null;
  scopes: string[];
};

export class LinkedInOAuthError extends Error {
  readonly kind: 'configuration' | 'network' | 'provider_rejected' | 'invalid_response';
  readonly status: number | null;

  constructor(
    kind: LinkedInOAuthError['kind'],
    message: string,
    status: number | null = null,
  ) {
    super(message);
    this.name = 'LinkedInOAuthError';
    this.kind = kind;
    this.status = status;
  }
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new LinkedInOAuthError('configuration', `${name} is not configured`);
  return value;
}

function parsePositiveNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function parseToken(value: unknown) {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  return token.length >= 16 && token.length <= 4096 ? token : null;
}

function parseScopes(value: unknown) {
  if (typeof value !== 'string') return [];
  return Array.from(new Set(value.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean))).sort();
}

function validateRedirectUri(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new LinkedInOAuthError('configuration', 'LINKEDIN_OAUTH_REDIRECT_URI is invalid');
  }

  const isLocalDevelopment = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !isLocalDevelopment) {
    throw new LinkedInOAuthError('configuration', 'LinkedIn OAuth redirect URI must use HTTPS');
  }

  return url.toString();
}

export function getLinkedInOAuthConfig(): LinkedInOAuthConfig {
  const clientId = requiredEnv('LINKEDIN_CLIENT_ID');
  const clientSecret = requiredEnv('LINKEDIN_CLIENT_SECRET');
  const redirectUri = validateRedirectUri(
    process.env.LINKEDIN_OAUTH_REDIRECT_URI?.trim() || DEFAULT_REDIRECT_URI,
  );

  return { clientId, clientSecret, redirectUri };
}

export function createLinkedInOAuthState() {
  return randomBytes(32).toString('base64url');
}

export function linkedInOAuthStateMatches(received: string | null, expected: string | null) {
  if (!received || !expected) return false;
  if (!/^[A-Za-z0-9_-]{40,128}$/.test(received) || !/^[A-Za-z0-9_-]{40,128}$/.test(expected)) {
    return false;
  }

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function buildLinkedInAuthorizationUrl(state: string) {
  if (!/^[A-Za-z0-9_-]{40,128}$/.test(state)) {
    throw new LinkedInOAuthError('configuration', 'LinkedIn OAuth state is invalid');
  }

  const config = getLinkedInOAuthConfig();
  const url = new URL(LINKEDIN_AUTHORIZATION_ENDPOINT);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', LINKEDIN_MARKETING_REQUIRED_SCOPES.join(' '));
  return url;
}

export async function exchangeLinkedInAuthorizationCode(
  code: string,
): Promise<LinkedInOAuthTokenExchange> {
  const normalizedCode = code.trim();
  if (!normalizedCode || normalizedCode.length > 4096) {
    throw new LinkedInOAuthError('invalid_response', 'LinkedIn authorization code is invalid');
  }

  const config = getLinkedInOAuthConfig();
  let response: Response;
  try {
    response = await fetch(LINKEDIN_ACCESS_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: normalizedCode,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
      cache: 'no-store',
    });
  } catch {
    throw new LinkedInOAuthError('network', 'LinkedIn OAuth token exchange network failure');
  }

  if (!response.ok) {
    throw new LinkedInOAuthError(
      'provider_rejected',
      `LinkedIn OAuth token exchange rejected with status ${response.status}`,
      response.status,
    );
  }

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  const accessToken = parseToken(payload?.access_token);
  if (!accessToken) {
    throw new LinkedInOAuthError('invalid_response', 'LinkedIn OAuth response omitted a valid access token');
  }

  return {
    accessToken,
    expiresIn: parsePositiveNumber(payload?.expires_in),
    refreshToken: parseToken(payload?.refresh_token),
    refreshTokenExpiresIn: parsePositiveNumber(payload?.refresh_token_expires_in),
    scopes: parseScopes(payload?.scope),
  };
}
