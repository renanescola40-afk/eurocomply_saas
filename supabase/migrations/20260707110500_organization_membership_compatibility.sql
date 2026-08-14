-- Canonical compatibility prerequisite for reviewed enterprise migrations.
-- M9 defines the underlying membership check. Several later July migrations
-- depend on public.is_organization_member(uuid), but that compatibility name
-- was never created in the canonical source tree.
--
-- Keep this wrapper SECURITY INVOKER: it delegates to the existing M9 helper
-- and does not introduce another privileged SECURITY DEFINER function into the
-- API-exposed public schema.

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select public.enterprise_member_can_read(p_organization_id);
$$;

revoke all on function public.is_organization_member(uuid) from public;
grant execute on function public.is_organization_member(uuid) to authenticated, service_role;
