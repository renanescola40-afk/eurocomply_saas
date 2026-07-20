begin;

do $$
begin
  if to_regclass('public.ai_governance_decisions') is null then
    raise exception 'required table public.ai_governance_decisions is missing';
  end if;
end
$$;

alter table public.ai_governance_decisions enable row level security;
alter table public.ai_governance_decisions force row level security;

revoke insert, update, delete on public.ai_governance_decisions from anon, authenticated;

drop policy if exists ai_governance_decisions_authenticated_insert_deny on public.ai_governance_decisions;
create policy ai_governance_decisions_authenticated_insert_deny
on public.ai_governance_decisions
for insert
to authenticated
with check (false);

drop policy if exists ai_governance_decisions_authenticated_update_deny on public.ai_governance_decisions;
create policy ai_governance_decisions_authenticated_update_deny
on public.ai_governance_decisions
for update
to authenticated
using (false)
with check (false);

drop policy if exists ai_governance_decisions_authenticated_delete_deny on public.ai_governance_decisions;
create policy ai_governance_decisions_authenticated_delete_deny
on public.ai_governance_decisions
for delete
to authenticated
using (false);

commit;
