import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export const LINKEDIN_ACCESS_TOKEN_SECRET_NAME = 'linkedin_marketing_access_token';
export const LINKEDIN_REFRESH_TOKEN_SECRET_NAME = 'linkedin_marketing_refresh_token';

export type LinkedInCredentialSource = 'environment' | 'vault';

export type LinkedInAccessTokenCredential = {
  token: string;
  source: LinkedInCredentialSource;
};

type StoreLinkedInOAuthTokensInput = {
  accessToken: string;
  accessTokenExpiresIn: number | null;
  refreshToken?: string | null;
  refreshTokenExpiresIn?: number | null;
  scopes: string[];
};

function normalizeToken(value: string | null | undefined) {
  const token = value?.trim();
  return token && token.length >= 16 && token.length <= 4096 ? token : null;
}

function isBridgeUnavailable(error: { code?: string | null; message?: string | null } | null) {
  if (!error) return false;
  const message = String(error.message ?? '').toLowerCase();
  return error.code === 'PGRST202'
    || error.code === '42883'
    || message.includes('read_linkedin_marketing_secret') && message.includes('not found');
}

async function readVaultSecret(name: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('read_linkedin_marketing_secret', { p_name: name });

  if (error) {
    if (isBridgeUnavailable(error)) return null;
    throw new Error('LinkedIn Vault credential read failed');
  }

  return typeof data === 'string' ? normalizeToken(data) : null;
}

export async function getLinkedInAccessTokenCredential(): Promise<LinkedInAccessTokenCredential | null> {
  const vaultToken = await readVaultSecret(LINKEDIN_ACCESS_TOKEN_SECRET_NAME);
  if (vaultToken) {
    return { token: vaultToken, source: 'vault' };
  }

  const environmentToken = normalizeToken(process.env.LINKEDIN_ACCESS_TOKEN);
  return environmentToken ? { token: environmentToken, source: 'environment' } : null;
}

export async function getLinkedInRefreshToken(): Promise<string | null> {
  return readVaultSecret(LINKEDIN_REFRESH_TOKEN_SECRET_NAME);
}

export async function storeLinkedInOAuthTokens(input: StoreLinkedInOAuthTokensInput) {
  const accessToken = normalizeToken(input.accessToken);
  if (!accessToken) throw new Error('LinkedIn OAuth access token is invalid');

  const refreshToken = normalizeToken(input.refreshToken);
  const now = Date.now();
  const accessExpiresAt = input.accessTokenExpiresIn && input.accessTokenExpiresIn > 0
    ? new Date(now + input.accessTokenExpiresIn * 1000).toISOString()
    : 'provider-unspecified';
  const refreshExpiresAt = input.refreshTokenExpiresIn && input.refreshTokenExpiresIn > 0
    ? new Date(now + input.refreshTokenExpiresIn * 1000).toISOString()
    : 'provider-unspecified';
  const scopeSummary = input.scopes.slice().sort().join(' ');

  const supabase = createAdminClient();
  const { error } = await supabase.rpc('store_linkedin_marketing_oauth_credentials', {
    p_access_token: accessToken,
    p_access_description: `RISCK COMPLY LinkedIn access token; expires_at=${accessExpiresAt}; scopes=${scopeSummary}`.slice(0, 500),
    p_refresh_token: refreshToken,
    p_refresh_description: refreshToken
      ? `RISCK COMPLY LinkedIn refresh token; expires_at=${refreshExpiresAt}; scopes=${scopeSummary}`.slice(0, 500)
      : null,
  });

  if (error) throw new Error('LinkedIn Vault OAuth credential rotation failed');
}
