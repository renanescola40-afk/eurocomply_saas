-- P1: force risk-register mutations through reviewed backend controls.
-- Authenticated tenant reads remain governed by the existing RLS policy.

do $$
begin
  if to_regclass('public.risks') is null then
    raise exception 'required table public.risks is missing';
  end if;
end
$$;

alter table public.risks enable row level security;
alter table public.risks force row level security;

-- Remove the original broad manager mutation policy. Reads continue through
-- "Members can read risks".
drop policy if exists "Managers can manage risks" on public.risks;

revoke insert, update, delete on table public.risks from anon;
revoke insert, update, delete on table public.risks from authenticated;
grant select on table public.risks to authenticated;

grant select, insert, update, delete on table public.risks to service_role;

-- Explicit fail-closed policies make the intended client boundary visible and
-- resilient to accidental future table grants.
drop policy if exists "Authenticated clients cannot insert risks" on public.risks;
create policy "Authenticated clients cannot insert risks"
on public.risks
for insert
to authenticated
with check (false);

drop policy if exists "Authenticated clients cannot update risks" on public.risks;
create policy "Authenticated clients cannot update risks"
on public.risks
for update
to authenticated
using (false)
with check (false);

drop policy if exists "Authenticated clients cannot delete risks" on public.risks;
create policy "Authenticated clients cannot delete risks"
on public.risks
for delete
to authenticated
using (false);

comment on table public.risks is
  'Tenant-scoped risk register. Authenticated clients may read through RLS; mutations are backend-owned.';
