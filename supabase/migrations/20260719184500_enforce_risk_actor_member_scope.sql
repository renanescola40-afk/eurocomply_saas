create or replace function public.enforce_risk_actor_member_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  scoped_user_id uuid;
begin
  if tg_argv[0] = 'created_by' then
    scoped_user_id := new.created_by;
  elsif tg_argv[0] = 'owner_user_id' then
    scoped_user_id := new.owner_user_id;
  else
    raise exception 'unsupported_risk_actor_scope'
      using errcode = 'invalid_parameter_value';
  end if;

  if scoped_user_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = new.organization_id
      and membership.user_id = scoped_user_id
  ) then
    raise exception 'risk_actor_not_organization_member'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_risk_actor_member_scope() from public;
revoke all on function public.enforce_risk_actor_member_scope() from anon;
revoke all on function public.enforce_risk_actor_member_scope() from authenticated;

drop trigger if exists enforce_risk_creator_member_scope on public.risks;
create trigger enforce_risk_creator_member_scope
before insert or update of organization_id, created_by
on public.risks
for each row
execute function public.enforce_risk_actor_member_scope('created_by');

drop trigger if exists enforce_risk_owner_member_scope on public.risks;
create trigger enforce_risk_owner_member_scope
before insert or update of organization_id, owner_user_id
on public.risks
for each row
execute function public.enforce_risk_actor_member_scope('owner_user_id');
