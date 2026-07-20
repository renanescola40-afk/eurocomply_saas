-- Keep AI-incident mutations behind reviewed server-side boundaries.
-- Authenticated users retain tenant-scoped reads, while browser/PostgREST DML is
-- denied even when a prior migration installed a permissive write policy.

do $$
begin
  if to_regclass('public.ai_incidents') is null then
    raise exception 'required table public.ai_incidents is missing';
  end if;
end
$$;

alter table public.ai_incidents enable row level security;
alter table public.ai_incidents force row level security;

-- Remove direct-client write policies without relying on historical policy names.
-- Service-role workflows bypass RLS and remain governed by explicit grants and RPC
-- execution permissions.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
      from pg_policies
     where schemaname = 'public'
       and tablename = 'ai_incidents'
       and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')
       and roles && array['public', 'anon', 'authenticated']::name[]
  loop
    execute format(
      'drop policy if exists %I on public.ai_incidents',
      policy_record.policyname
    );
  end loop;
end
$$;

-- Privileges and policies both fail closed for direct client mutation attempts.
revoke insert, update, delete on table public.ai_incidents from anon;
revoke insert, update, delete on table public.ai_incidents from authenticated;
grant select on table public.ai_incidents to authenticated;
grant select, insert, update, delete on table public.ai_incidents to service_role;

create policy "deny_authenticated_ai_incident_insert"
  on public.ai_incidents
  for insert
  to authenticated
  with check (false);

create policy "deny_authenticated_ai_incident_update"
  on public.ai_incidents
  for update
  to authenticated
  using (false)
  with check (false);

create policy "deny_authenticated_ai_incident_delete"
  on public.ai_incidents
  for delete
  to authenticated
  using (false);

notify pgrst, 'reload schema';
