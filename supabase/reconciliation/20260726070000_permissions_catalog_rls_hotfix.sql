begin;

alter table if exists public.permissions enable row level security;
alter table if exists public.permissions force row level security;
alter table if exists public.role_permissions enable row level security;
alter table if exists public.role_permissions force row level security;
alter table if exists public.stripe_webhook_events enable row level security;
alter table if exists public.stripe_webhook_events force row level security;

revoke all on table public.permissions from anon, authenticated;
revoke all on table public.role_permissions from anon, authenticated;
revoke all on table public.stripe_webhook_events from anon, authenticated;

grant select on table public.permissions to authenticated;
grant select on table public.role_permissions to authenticated;

DROP POLICY IF EXISTS permissions_authenticated_read ON public.permissions;
CREATE POLICY permissions_authenticated_read
  ON public.permissions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS role_permissions_authenticated_read ON public.role_permissions;
CREATE POLICY role_permissions_authenticated_read
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Webhook idempotency records are backend-only. Intentionally create no policy.

CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);

INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20260726070000',
  ARRAY['production RLS reconciliation for permissions catalogs and Stripe webhook events'],
  'permissions_catalog_rls_hotfix'
)
ON CONFLICT (version) DO NOTHING;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['permissions','role_permissions'] loop
    if not pg_catalog.has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT') then
      raise exception 'authenticated SELECT privilege missing for public.%', table_name;
    end if;

    if pg_catalog.has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
       or pg_catalog.has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
       or pg_catalog.has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
       or pg_catalog.has_table_privilege('authenticated', format('public.%I', table_name), 'TRUNCATE')
       or pg_catalog.has_table_privilege('authenticated', format('public.%I', table_name), 'REFERENCES')
       or pg_catalog.has_table_privilege('authenticated', format('public.%I', table_name), 'TRIGGER') then
      raise exception 'authenticated write/admin privilege survived for public.%', table_name;
    end if;

    if pg_catalog.has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
       or pg_catalog.has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
       or pg_catalog.has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
       or pg_catalog.has_table_privilege('anon', format('public.%I', table_name), 'DELETE') then
      raise exception 'anon privilege survived for public.%', table_name;
    end if;
  end loop;

  if pg_catalog.has_table_privilege('authenticated', 'public.stripe_webhook_events', 'SELECT')
     or pg_catalog.has_table_privilege('authenticated', 'public.stripe_webhook_events', 'INSERT')
     or pg_catalog.has_table_privilege('authenticated', 'public.stripe_webhook_events', 'UPDATE')
     or pg_catalog.has_table_privilege('authenticated', 'public.stripe_webhook_events', 'DELETE')
     or pg_catalog.has_table_privilege('anon', 'public.stripe_webhook_events', 'SELECT')
     or pg_catalog.has_table_privilege('anon', 'public.stripe_webhook_events', 'INSERT')
     or pg_catalog.has_table_privilege('anon', 'public.stripe_webhook_events', 'UPDATE')
     or pg_catalog.has_table_privilege('anon', 'public.stripe_webhook_events', 'DELETE') then
    raise exception 'client privilege survived for public.stripe_webhook_events';
  end if;
end $$;

commit;
