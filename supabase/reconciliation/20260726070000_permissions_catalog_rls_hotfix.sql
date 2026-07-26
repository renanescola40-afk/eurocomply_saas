begin;

alter table if exists public.permissions enable row level security;
alter table if exists public.permissions force row level security;
alter table if exists public.role_permissions enable row level security;
alter table if exists public.role_permissions force row level security;
alter table if exists public.stripe_webhook_events enable row level security;
alter table if exists public.stripe_webhook_events force row level security;

revoke all on table public.permissions from anon;
revoke all on table public.role_permissions from anon;
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

commit;
