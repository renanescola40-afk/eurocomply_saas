import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const oauth = readFileSync('src/lib/marketing/linkedin-oauth.ts', 'utf8');
const credentials = readFileSync('src/lib/marketing/linkedin-credentials.ts', 'utf8');
const startRoute = readFileSync('src/app/api/platform/marketing/linkedin/oauth/start/route.ts', 'utf8');
const callbackRoute = readFileSync('src/app/api/platform/marketing/linkedin/oauth/callback/route.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260903110000_linkedin_oauth_vault_bridge.sql', 'utf8');
const inventory = readFileSync('docs/security/API_ROUTE_INVENTORY.billing.md', 'utf8');

describe('LinkedIn OAuth Vault bridge', () => {
  it('uses the official authorization-code endpoints and state protection', () => {
    expect(oauth).toContain('https://www.linkedin.com/oauth/v2/authorization');
    expect(oauth).toContain('https://www.linkedin.com/oauth/v2/accessToken');
    expect(oauth).toContain("randomBytes(32).toString('base64url')");
    expect(oauth).toContain('timingSafeEqual');
    expect(oauth).toContain("response_type', 'code'");
    expect(oauth).toContain("grant_type: 'authorization_code'");
    expect(oauth).toContain('LINKEDIN_MARKETING_REQUIRED_SCOPES.join');
    expect(oauth).not.toContain('response.text()');
  });

  it('keeps OAuth initiation and callback behind platform security MFA and fail-closed rate limits', () => {
    for (const route of [startRoute, callbackRoute]) {
      expect(route).toContain('requireApiUser');
      expect(route).toContain("requirePlatformCapability(user.id, 'security')");
      expect(route).toContain('checkDistributedRateLimit');
      expect(route).toContain("failureMode: 'fail-closed'");
    }

    expect(startRoute).toContain("fetchSite === 'cross-site'");
    expect(startRoute).toContain('LINKEDIN_OAUTH_STATE_COOKIE');
    expect(startRoute).toContain('httpOnly: true');
    expect(startRoute).toContain('secure: true');
    expect(startRoute).toContain("sameSite: 'lax'");
    expect(callbackRoute).toContain('linkedInOAuthStateMatches');
    expect(callbackRoute).toContain('inspectLinkedInAccessToken');
    expect(callbackRoute).toContain('inspection.hasRequiredScopes');
    expect(callbackRoute.indexOf('if (!linkedInOAuthStateMatches')).toBeLessThan(
      callbackRoute.indexOf("if (request.nextUrl.searchParams.has('error'))"),
    );
  });

  it('rotates approved provider credentials atomically through a serialized service-role-only Vault RPC', () => {
    expect(credentials).toContain("rpc('store_linkedin_marketing_oauth_credentials'");
    expect(credentials).toContain("rpc('read_linkedin_marketing_secret'");
    expect(credentials).toContain('LINKEDIN_REFRESH_TOKEN_SECRET_NAME');
    expect(callbackRoute).toContain('storeLinkedInOAuthTokens');

    expect(migration).toContain("extname = 'supabase_vault'");
    expect(migration).toContain('vault.decrypted_secrets');
    expect(migration).toContain('vault.create_secret');
    expect(migration).toContain('vault.update_secret');
    expect(migration).toContain('pg_advisory_xact_lock(20260903, 110000)');
    expect(migration).toContain('DELETE FROM vault.secrets');
    expect(migration).toContain("s.name = 'linkedin_marketing_access_token'");
    expect(migration).toContain("s.name = 'linkedin_marketing_refresh_token'");
    expect(migration).toContain('s.id <> v_access_id');
    expect(migration).toContain('s.id <> v_refresh_id');
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain('SET search_path = pg_catalog, vault');
    expect(migration).not.toContain('SET search_path = pg_catalog, public, vault');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.read_linkedin_marketing_secret(text) TO service_role');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.store_linkedin_marketing_oauth_credentials(text, text, text, text) TO service_role');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.read_linkedin_marketing_secret(text) FROM anon');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.read_linkedin_marketing_secret(text) FROM authenticated');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.store_linkedin_marketing_oauth_credentials(text, text, text, text) FROM anon');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.store_linkedin_marketing_oauth_credentials(text, text, text, text) FROM authenticated');
  });

  it('never serializes provider secrets into OAuth redirects or browser-visible parameters', () => {
    expect(callbackRoute).not.toContain("target.searchParams.set('access_token'");
    expect(callbackRoute).not.toContain("target.searchParams.set('refresh_token'");
    expect(callbackRoute).not.toContain('NextResponse.json');
    expect(callbackRoute).toContain("target.searchParams.set('linkedin', outcome)");
    expect(callbackRoute).toContain("Referrer-Policy', 'no-referrer'");
    expect(inventory).toContain('src/app/api/platform/marketing/linkedin/oauth/start/route.ts');
    expect(inventory).toContain('src/app/api/platform/marketing/linkedin/oauth/callback/route.ts');
  });
});
