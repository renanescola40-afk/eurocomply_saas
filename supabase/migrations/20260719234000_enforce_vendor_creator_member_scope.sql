-- Enforce same-tenant creator attribution for organization-scoped vendor records.
-- Prospective guard: existing rows are not rewritten or claimed as validated.

create or replace function public.enforce_vendor_creator_member_scope()
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
    from public.organization_members as membership
    where membership.organization_id = new.organization_id
      and membership.user_id = new.created_by
  ) then
    raise exception using
      errcode = '23514',
      message = 'vendor creator must belong to the vendor organization';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_vendor_creator_member_scope() from public;
revoke all on function public.enforce_vendor_creator_member_scope() from anon;
revoke all on function public.enforce_vendor_creator_member_scope() from authenticated;

drop trigger if exists enforce_vendor_creator_member_scope on public.vendors;

create trigger enforce_vendor_creator_member_scope
before insert or update of organization_id, created_by
on public.vendors
for each row
execute function public.enforce_vendor_creator_member_scope();

comment on function public.enforce_vendor_creator_member_scope() is
  'Rejects non-null vendor creator attribution when the user is not a member of the vendor organization.';
