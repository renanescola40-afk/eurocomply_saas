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

async function writeVaultSecret(name: string, secret: string, description: string) {
  const normalized = normalizeToken(secret);
  if (!normalized) throw new Error('LinkedIn OAuth credential is invalid');

  const supabase = createAdminClient();
  const { error } = await supabase.rpc('store_linkedin_marketing_secret', {
    p_name: name,
    p_secret: normalized,
    p_description: description.slice(0, 500),
  });

  if (error) throw new Error('LinkedIn Vault credential write failed');
}

export async function getLinkedInAccessTokenCredential(): Promise<LinkedInAccessTokenCredential | null> {
  const environmentToken = normalizeToken(process.env.LINKEDIN_ACCESS_TOKEN);
  if (environmentToken) {
    return { token: environmentToken, source: 'environment' };
  }

  const vaultToken = await readVaultSecret(LINKEDIN_ACCESS_TOKEN_SECRET_NAME);
  return vaultToken ? { token: vaultToken, source: 'vault' } : null;
}

export async function getLinkedInRefreshToken(): Promise<string | null> {
  return readVaultSecret(LINKEDIN_REFRESH_TOKEN_SECRET_NAME);
}

export async function storeLinkedInOAuthTokens(input: StoreLinkedInOAuthTokensInput) {
  const now = Date.now();
  const accessExpiresAt = input.accessTokenExpiresIn && input.accessTokenExpiresIn > 0
    ? new Date(now + input.accessTokenExpiresIn * 1000).toISOString()
    : 'provider-unspecified';
  const scopeSummary = input.scopes.slice().sort().join(' ');

  await writeVaultSecret(
    LINKEDIN_ACCESS_TOKEN_SECRET_NAME,
    input.accessToken,
    `RISCK COMPLY LinkedIn access token; expires_at=${accessExpiresAt}; scopes=${scopeSummary}`,
  );

  const refreshToken = normalizeToken(input.refreshToken);
  if (refreshToken) {
    const refreshExpiresAt = input.refreshTokenExpiresIn && input.refreshTokenExpiresIn > 0
      ? new Date(now + input.refreshTokenExpiresIn * 1000).toISOString()
      : 'provider-unspecified';

    await writeVaultSecret(
      LINKEDIN_REFRESH_TOKEN_SECRET_NAME,
      refreshToken,
      `RISCK COMPLY LinkedIn refresh token; expires_at=${refreshExpiresAt}; scopes=${scopeSummary}`,
    );
  }
}
