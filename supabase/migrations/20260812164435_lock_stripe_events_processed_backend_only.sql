-- enterprise-migration-review: approved
-- The Stripe processing ledger is an internal webhook idempotency/recovery table.
-- All application access uses the server-side service role; client grants are unnecessary.

revoke all on table public.stripe_events_processed from public, anon, authenticated;
alter table public.stripe_events_processed force row level security;

do $stripe_events_processed_acl_guard$
begin
  if has_table_privilege('anon', 'public.stripe_events_processed', 'SELECT')
     or has_table_privilege('anon', 'public.stripe_events_processed', 'INSERT')
     or has_table_privilege('authenticated', 'public.stripe_events_processed', 'SELECT')
     or has_table_privilege('authenticated', 'public.stripe_events_processed', 'INSERT')
     or not has_table_privilege('service_role', 'public.stripe_events_processed', 'SELECT')
     or not has_table_privilege('service_role', 'public.stripe_events_processed', 'INSERT') then
    raise exception 'stripe_events_processed backend-only ACL postcondition failed';
  end if;
end
$stripe_events_processed_acl_guard$;
