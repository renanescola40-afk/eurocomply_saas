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

CREATE OR REPLACE FUNCTION public.store_linkedin_marketing_secret(
  p_name text,
  p_secret text,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, vault
AS $$
DECLARE
  v_id uuid;
  v_description text;
BEGIN
  IF p_name NOT IN ('linkedin_marketing_access_token', 'linkedin_marketing_refresh_token') THEN
    RAISE EXCEPTION 'unsupported LinkedIn marketing secret name';
  END IF;

  IF p_secret IS NULL OR length(btrim(p_secret)) < 16 OR length(p_secret) > 4096 THEN
    RAISE EXCEPTION 'invalid LinkedIn marketing secret length';
  END IF;

  v_description := left(COALESCE(NULLIF(btrim(p_description), ''), 'RISCK COMPLY LinkedIn OAuth credential'), 500);

  SELECT s.id
  INTO v_id
  FROM vault.secrets AS s
  WHERE s.name = p_name
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_id IS NULL THEN
    v_id := vault.create_secret(p_secret, p_name, v_description, NULL);
  ELSE
    PERFORM vault.update_secret(v_id, p_secret, p_name, v_description, NULL);
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.read_linkedin_marketing_secret(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.read_linkedin_marketing_secret(text) FROM anon;
REVOKE ALL ON FUNCTION public.read_linkedin_marketing_secret(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.read_linkedin_marketing_secret(text) TO service_role;

REVOKE ALL ON FUNCTION public.store_linkedin_marketing_secret(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.store_linkedin_marketing_secret(text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.store_linkedin_marketing_secret(text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.store_linkedin_marketing_secret(text, text, text) TO service_role;

commit;
