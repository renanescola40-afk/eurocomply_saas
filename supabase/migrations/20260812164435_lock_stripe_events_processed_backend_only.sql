-- enterprise-migration-review: approved
-- The Stripe processing ledger is an internal webhook idempotency/recovery table.
-- All application access uses the server-side service role; client grants are unnecessary.
--
-- Clean-replay note: historical ledgers may contain this hardening migration before
-- the table creator is present. Harden only when the table exists; when it exists,
-- preserve the backend-only ACL and FORCE RLS postcondition.

do $stripe_events_processed_backend_only$
begin
  if to_regclass('public.stripe_events_processed') is not null then
    execute 'revoke all on table public.stripe_events_processed from public, anon, authenticated';
    execute 'alter table public.stripe_events_processed force row level security';

    if has_table_privilege('anon', 'public.stripe_events_processed', 'SELECT')
       or has_table_privilege('anon', 'public.stripe_events_processed', 'INSERT')
       or has_table_privilege('authenticated', 'public.stripe_events_processed', 'SELECT')
       or has_table_privilege('authenticated', 'public.stripe_events_processed', 'INSERT')
       or not has_table_privilege('service_role', 'public.stripe_events_processed', 'SELECT')
       or not has_table_privilege('service_role', 'public.stripe_events_processed', 'INSERT') then
      raise exception 'stripe_events_processed backend-only ACL postcondition failed';
    end if;
  end if;
end
$stripe_events_processed_backend_only$;
