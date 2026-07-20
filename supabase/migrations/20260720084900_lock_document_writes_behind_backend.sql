-- P1: force controlled-document mutations through reviewed backend controls.
-- Authenticated tenant reads remain governed by the existing RLS policies.

do $$
begin
  if to_regclass('public.documents') is null then
    raise exception 'required table public.documents is missing';
  end if;
end
$$;

alter table public.documents enable row level security;
alter table public.documents force row level security;

-- Remove authenticated/public mutation policies without depending on historical
-- policy names. Read policies remain untouched.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'documents'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and roles && array['public', 'anon', 'authenticated']::name[]
  loop
    execute format('drop policy if exists %I on public.documents', policy_record.policyname);
  end loop;
end
$$;

revoke insert, update, delete on table public.documents from anon;
revoke insert, update, delete on table public.documents from authenticated;
grant select on table public.documents to authenticated;

grant select, insert, update, delete on table public.documents to service_role;

-- Explicit fail-closed policies make the intended client boundary visible and
-- resilient to accidental future table grants.
drop policy if exists "Authenticated clients cannot insert documents" on public.documents;
create policy "Authenticated clients cannot insert documents"
on public.documents
for insert
to authenticated
with check (false);

drop policy if exists "Authenticated clients cannot update documents" on public.documents;
create policy "Authenticated clients cannot update documents"
on public.documents
for update
to authenticated
using (false)
with check (false);

drop policy if exists "Authenticated clients cannot delete documents" on public.documents;
create policy "Authenticated clients cannot delete documents"
on public.documents
for delete
to authenticated
using (false);

comment on table public.documents is
  'Tenant-scoped controlled document metadata. Authenticated clients may read through RLS; mutations are backend-owned.';
