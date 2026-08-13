begin;

alter table public.permissions enable row level security;
alter table public.permissions force row level security;
alter table public.role_permissions enable row level security;
alter table public.role_permissions force row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.stripe_webhook_events force row level security;

revoke all on table public.permissions from anon, authenticated;
revoke all on table public.role_permissions from anon, authenticated;
revoke all on table public.stripe_webhook_events from anon, authenticated;

grant select on table public.permissions to authenticated;
grant select on table public.role_permissions to authenticated;

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
