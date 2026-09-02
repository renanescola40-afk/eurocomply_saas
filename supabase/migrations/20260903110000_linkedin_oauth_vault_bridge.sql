-- RISCK COMPLY — LinkedIn OAuth Vault bridge
-- Forward-only migration. Must remain after the Enterprise Step-Up V29 lane.
-- Stores provider OAuth tokens in Supabase Vault and exposes only bounded
-- service-role RPCs to the application runtime.

begin;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'supabase_vault'
  ) THEN
    RAISE EXCEPTION 'supabase_vault extension is required for LinkedIn OAuth token storage';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.read_linkedin_marketing_secret(p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, vault
AS $$
DECLARE
  v_secret text;
BEGIN
  IF p_name NOT IN ('linkedin_marketing_access_token', 'linkedin_marketing_refresh_token') THEN
    RAISE EXCEPTION 'unsupported LinkedIn marketing secret name';
  END IF;

  SELECT ds.decrypted_secret
  INTO v_secret
  FROM vault.decrypted_secrets AS ds
  WHERE ds.name = p_name
  ORDER BY ds.updated_at DESC NULLS LAST, ds.created_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_secret;
END;
$$;

CREATE OR REPLACE FUNCTION public.store_linkedin_marketing_oauth_credentials(
  p_access_token text,
  p_access_description text,
  p_refresh_token text DEFAULT NULL,
  p_refresh_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, vault
AS $$
DECLARE
  v_access_id uuid;
  v_refresh_id uuid;
  v_access_description text;
  v_refresh_description text;
BEGIN
  IF p_access_token IS NULL
     OR length(btrim(p_access_token)) < 16
     OR length(p_access_token) > 4096 THEN
    RAISE EXCEPTION 'invalid LinkedIn access token length';
  END IF;

  IF p_refresh_token IS NOT NULL
     AND (length(btrim(p_refresh_token)) < 16 OR length(p_refresh_token) > 4096) THEN
    RAISE EXCEPTION 'invalid LinkedIn refresh token length';
  END IF;

  v_access_description := left(
    COALESCE(NULLIF(btrim(p_access_description), ''), 'RISCK COMPLY LinkedIn access token'),
    500
  );
  v_refresh_description := left(
    COALESCE(NULLIF(btrim(p_refresh_description), ''), 'RISCK COMPLY LinkedIn refresh token'),
    500
  );

  SELECT s.id
  INTO v_access_id
  FROM vault.secrets AS s
  WHERE s.name = 'linkedin_marketing_access_token'
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_access_id IS NULL THEN
    v_access_id := vault.create_secret(
      p_access_token,
      'linkedin_marketing_access_token',
      v_access_description,
      NULL
    );
  ELSE
    PERFORM vault.update_secret(
      v_access_id,
      p_access_token,
      'linkedin_marketing_access_token',
      v_access_description,
      NULL
    );
  END IF;

  SELECT s.id
  INTO v_refresh_id
  FROM vault.secrets AS s
  WHERE s.name = 'linkedin_marketing_refresh_token'
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
  LIMIT 1;

  IF p_refresh_token IS NULL THEN
    DELETE FROM vault.secrets AS s
    WHERE s.name = 'linkedin_marketing_refresh_token';
  ELSIF v_refresh_id IS NULL THEN
    v_refresh_id := vault.create_secret(
      p_refresh_token,
      'linkedin_marketing_refresh_token',
      v_refresh_description,
      NULL
    );
  ELSE
    PERFORM vault.update_secret(
      v_refresh_id,
      p_refresh_token,
      'linkedin_marketing_refresh_token',
      v_refresh_description,
      NULL
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.read_linkedin_marketing_secret(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.read_linkedin_marketing_secret(text) FROM anon;
REVOKE ALL ON FUNCTION public.read_linkedin_marketing_secret(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.read_linkedin_marketing_secret(text) TO service_role;

REVOKE ALL ON FUNCTION public.store_linkedin_marketing_oauth_credentials(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.store_linkedin_marketing_oauth_credentials(text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.store_linkedin_marketing_oauth_credentials(text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.store_linkedin_marketing_oauth_credentials(text, text, text, text) TO service_role;

commit;
