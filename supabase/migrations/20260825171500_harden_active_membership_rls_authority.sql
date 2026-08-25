begin;

-- P0 tenant-authorization closure.
-- The governed licensing identity adds organization_members.status, but the
-- canonical private RLS helpers and several legacy membership authorities
-- historically authorized any membership row. Once status exists,
-- suspended/deprovisioned memberships must cease to be tenant authority for
-- PostgREST and Storage immediately.

do $preconditions$
begin
  if to_regclass('public.organization_members') is null then
    raise exception 'organization_members is missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organization_members'
      and column_name = 'status'
      and is_nullable = 'NO'
  ) then
    raise exception 'organization_members.status is missing or nullable';
  end if;

  if to_regprocedure('app_private.is_org_member(uuid)') is null
     or to_regprocedure('app_private.has_org_role(uuid,text[])') is null then
    raise exception 'canonical private organization authorization helpers are missing';
  end if;

  if to_regclass('public.organization_add_ons') is null
     or to_regclass('storage.objects') is null then
    raise exception 'direct membership RLS policy relations are missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'organization_add_ons'
      and policyname = 'organization members can read add-ons'
      and cmd = 'SELECT'
  ) then
    raise exception 'organization add-ons membership policy is missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Members can read organization document objects'
      and cmd = 'SELECT'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Members can upload organization document objects'
      and cmd = 'INSERT'
  ) then
    raise exception 'compliance-documents membership policies are missing';
  end if;
end
$preconditions$;

create or replace function app_private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select target_organization_id is not null
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and lower(coalesce(om.status, '')) = 'active'
        and (
          (
            public.current_legacy_user_id() is not null
            and om.user_id = public.current_legacy_user_id()
          )
          or (
            public.current_clerk_user_id() is not null
            and om.clerk_user_id = public.current_clerk_user_id()
          )
        )
    );
$$;

create or replace function app_private.has_org_role(
  target_organization_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select target_organization_id is not null
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and lower(coalesce(om.status, '')) = 'active'
        and lower(om.role) = any(allowed_roles)
        and (
          (
            public.current_legacy_user_id() is not null
            and om.user_id = public.current_legacy_user_id()
          )
          or (
            public.current_clerk_user_id() is not null
            and om.clerk_user_id = public.current_clerk_user_id()
          )
        )
    );
$$;

-- Historical/full-schema installations may also contain the older public
-- SECURITY DEFINER helpers used by Enterprise Evidence and AI Literacy RLS.
-- Production does not currently contain these helpers, so do not create a new
-- surface there. Harden them only when they already exist.
do $legacy_helpers$
begin
  if to_regprocedure('public.enterprise_member_can_read(uuid)') is not null then
    execute $sql$
      create or replace function public.enterprise_member_can_read(p_organization_id uuid)
      returns boolean
      language sql
      stable
      security definer
      set search_path = pg_catalog
      as $function$
        select exists (
          select 1
          from public.organization_members om
          where om.organization_id = p_organization_id
            and lower(coalesce(om.status, '')) = 'active'
            and om.user_id = auth.uid()
        );
      $function$
    $sql$;
  end if;

  if to_regprocedure('public.enterprise_member_can_manage(uuid)') is not null then
    execute $sql$
      create or replace function public.enterprise_member_can_manage(p_organization_id uuid)
      returns boolean
      language sql
      stable
      security definer
      set search_path = pg_catalog
      as $function$
        select exists (
          select 1
          from public.organization_members om
          where om.organization_id = p_organization_id
            and lower(coalesce(om.status, '')) = 'active'
            and om.user_id = auth.uid()
            and lower(coalesce(om.role, 'viewer')) in ('owner', 'admin', 'editor', 'compliance_manager')
        );
      $function$
    $sql$;
  end if;
end
$legacy_helpers$;

-- Preserve the existing direct-policy identity semantics while adding the
-- status boundary. These three policies bypass the canonical helpers today and
-- therefore must be hardened in the same transaction as the helpers.
alter policy "organization members can read add-ons"
on public.organization_add_ons
to authenticated
using (
  exists (
    select 1
    from public.organization_members as members
    where members.organization_id = organization_add_ons.organization_id
      and lower(coalesce(members.status, '')) = 'active'
      and members.user_id = (select auth.uid())
  )
);

alter policy "Members can read organization document objects"
on storage.objects
to authenticated
using (
  bucket_id = 'compliance-documents'
  and split_part(name, '/', 1)::uuid in (
    select organization_id
    from public.organization_members
    where lower(coalesce(status, '')) = 'active'
      and user_id = (select auth.uid())
  )
);

alter policy "Members can upload organization document objects"
on storage.objects
to authenticated
with check (
  bucket_id = 'compliance-documents'
  and split_part(name, '/', 1)::uuid in (
    select organization_id
    from public.organization_members
    where lower(coalesce(status, '')) = 'active'
      and user_id = (select auth.uid())
  )
);

-- Preserve the existing private-helper execution model used by RLS policies.
revoke all on function app_private.is_org_member(uuid) from public, anon;
revoke all on function app_private.has_org_role(uuid, text[]) from public, anon;
grant execute on function app_private.is_org_member(uuid) to authenticated, service_role;
grant execute on function app_private.has_org_role(uuid, text[]) to authenticated, service_role;

do $postconditions$
declare
  member_definition text;
  role_definition text;
  legacy_read_definition text;
  legacy_manage_definition text;
  status_constraint_valid boolean := false;
  add_on_policy text;
  document_read_policy text;
  document_upload_policy text;
  stale_direct_membership_policies text;
begin
  select pg_get_functiondef('app_private.is_org_member(uuid)'::regprocedure)
    into member_definition;
  select pg_get_functiondef('app_private.has_org_role(uuid,text[])'::regprocedure)
    into role_definition;

  if coalesce(member_definition, '') not like '%status%active%'
     or coalesce(role_definition, '') not like '%status%active%' then
    raise exception 'canonical private RLS helpers are not active-membership aware';
  end if;

  if to_regprocedure('public.enterprise_member_can_read(uuid)') is not null then
    select pg_get_functiondef('public.enterprise_member_can_read(uuid)'::regprocedure)
      into legacy_read_definition;
    if coalesce(legacy_read_definition, '') not ilike '%status%active%' then
      raise exception 'legacy enterprise read membership helper is not active-membership aware';
    end if;
  end if;

  if to_regprocedure('public.enterprise_member_can_manage(uuid)') is not null then
    select pg_get_functiondef('public.enterprise_member_can_manage(uuid)'::regprocedure)
      into legacy_manage_definition;
    if coalesce(legacy_manage_definition, '') not ilike '%status%active%' then
      raise exception 'legacy enterprise manage membership helper is not active-membership aware';
    end if;
  end if;

  select qual into add_on_policy
  from pg_policies
  where schemaname = 'public'
    and tablename = 'organization_add_ons'
    and policyname = 'organization members can read add-ons';

  select qual into document_read_policy
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Members can read organization document objects';

  select with_check into document_upload_policy
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Members can upload organization document objects';

  if coalesce(add_on_policy, '') not ilike '%status%active%'
     or coalesce(document_read_policy, '') not ilike '%status%active%'
     or coalesce(document_upload_policy, '') not ilike '%status%active%' then
    raise exception 'direct membership RLS policies are not active-membership aware';
  end if;

  -- Generic final-state guard: if any public/storage policy still reaches
  -- organization_members directly, every expression that does so must carry an
  -- explicit active-membership predicate. Policies using hardened helper
  -- functions do not match this scan because the helper owns the boundary.
  select string_agg(format('%I.%I:%I', schemaname, tablename, policyname), ', ' order by schemaname, tablename, policyname)
    into stale_direct_membership_policies
  from pg_policies
  where schemaname in ('public', 'storage')
    and (
      coalesce(qual, '') ilike '%organization_members%'
      or coalesce(with_check, '') ilike '%organization_members%'
    )
    and (
      (coalesce(qual, '') ilike '%organization_members%'
       and not (coalesce(qual, '') ilike '%status%' and coalesce(qual, '') ilike '%active%'))
      or
      (coalesce(with_check, '') ilike '%organization_members%'
       and not (coalesce(with_check, '') ilike '%status%' and coalesce(with_check, '') ilike '%active%'))
    );

  if stale_direct_membership_policies is not null then
    raise exception 'direct organization_members policies remain status-unaware: %', stale_direct_membership_policies;
  end if;

  select exists (
    select 1
    from pg_constraint constraint_row
    where constraint_row.conrelid = 'public.organization_members'::regclass
      and constraint_row.conname = 'organization_members_status_check'
      and constraint_row.convalidated
      and pg_get_constraintdef(constraint_row.oid) like '%active%'
      and pg_get_constraintdef(constraint_row.oid) like '%suspended%'
      and pg_get_constraintdef(constraint_row.oid) like '%deprovisioned%'
  ) into status_constraint_valid;

  if not status_constraint_valid then
    raise exception 'organization_members status constraint is not canonical';
  end if;

  if has_function_privilege('anon', 'app_private.is_org_member(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'app_private.has_org_role(uuid,text[])', 'EXECUTE')
     or not has_function_privilege('authenticated', 'app_private.is_org_member(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'app_private.has_org_role(uuid,text[])', 'EXECUTE')
     or not has_function_privilege('service_role', 'app_private.is_org_member(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'app_private.has_org_role(uuid,text[])', 'EXECUTE') then
    raise exception 'canonical private RLS helper privileges drifted';
  end if;
end
$postconditions$;

notify pgrst, 'reload schema';

commit;
