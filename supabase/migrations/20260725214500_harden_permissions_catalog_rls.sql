-- Harden static authorization catalog tables and Stripe webhook idempotency storage.
-- This migration is intentionally idempotent so it can be reapplied safely.

begin;

-- permissions is a read-only authorization catalog for authenticated clients.
alter table if exists public.permissions enable row level security;
revoke all on table public.permissions from anon;
revoke insert, update, delete, truncate, references, trigger on table public.permissions from authenticated;
grant select on table public.permissions to authenticated;

drop policy if exists permissions_select_authenticated on public.permissions;
create policy permissions_select_authenticated
  on public.permissions
  for select
  to authenticated
  using (true);

-- role_permissions is also catalog data. Clients may read it to render/resolve RBAC,
-- but mutations remain migration/backend-only.
alter table if exists public.role_permissions enable row level security;
revoke all on table public.role_permissions from anon;
revoke insert, update, delete, truncate, references, trigger on table public.role_permissions from authenticated;
grant select on table public.role_permissions to authenticated;

drop policy if exists role_permissions_select_authenticated on public.role_permissions;
create policy role_permissions_select_authenticated
  on public.role_permissions
  for select
  to authenticated
  using (true);

-- Stripe webhook event rows are server-only idempotency/audit records.
-- Keep RLS enabled with no client policies and explicitly remove Data API access.
alter table if exists public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from anon, authenticated;

commit;
