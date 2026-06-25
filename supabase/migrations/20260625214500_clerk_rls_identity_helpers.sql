-- Add Clerk-aware identity helpers for tenant RLS without removing Supabase Auth UUID support.

create or replace function public.current_clerk_user_id()
returns text
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  );
$$;

revoke all on function public.current_clerk_user_id() from public;
grant execute on function public.current_clerk_user_id() to authenticated;

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and (
        (auth.uid() is not null and user_id = auth.uid())
        or (
          public.current_clerk_user_id() is not null
          and clerk_user_id = public.current_clerk_user_id()
        )
      )
  );
$$;

create or replace function public.has_org_role(target_organization_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and role = any(allowed_roles)
      and (
        (auth.uid() is not null and user_id = auth.uid())
        or (
          public.current_clerk_user_id() is not null
          and clerk_user_id = public.current_clerk_user_id()
        )
      )
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, text[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
