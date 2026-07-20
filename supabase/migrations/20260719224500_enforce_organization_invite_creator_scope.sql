-- Enforce same-tenant creator attribution for organization invitations.
-- Prospective guard: existing rows are not rewritten or presented as runtime-validated evidence.

create or replace function public.enforce_organization_invite_creator_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.organization_members as member
    where member.organization_id = new.organization_id
      and member.user_id = new.created_by
  ) then
    raise exception 'organization invite creator must belong to the invitation organization'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_organization_invite_creator_scope() from public;
revoke all on function public.enforce_organization_invite_creator_scope() from anon;
revoke all on function public.enforce_organization_invite_creator_scope() from authenticated;

drop trigger if exists enforce_organization_invite_creator_scope on public.organization_invites;

create trigger enforce_organization_invite_creator_scope
before insert or update of organization_id, created_by
on public.organization_invites
for each row
execute function public.enforce_organization_invite_creator_scope();
