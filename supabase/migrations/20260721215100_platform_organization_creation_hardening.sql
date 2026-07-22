begin;

create or replace function public.create_platform_enterprise_organization_atomic(
  p_name text,
  p_slug text,
  p_actor_user_id uuid
)
returns table (
  outcome text,
  organization_id uuid,
  organization_name text,
  organization_slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_columns text := 'name';
  v_values text := quote_literal(v_name);
  v_unsupported text;
  v_organization_id uuid;
  v_slug_exists boolean := false;
begin
  if p_actor_user_id is null
    or char_length(v_name) not between 2 and 160
    or v_slug !~ '^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])$' then
    return query select 'invalid_input'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if not exists (
    select 1
    from public.platform_admin_users as actor
    where actor.user_id = p_actor_user_id
      and actor.enabled = true
      and actor.role in ('owner','sales_admin','platform_owner','platform_admin')
  ) then
    return query select 'platform_role_required'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name = 'name'
  ) then
    return query select 'schema_unsupported'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name = 'slug'
  ) then
    execute 'select exists (select 1 from public.organizations where slug = $1)'
      into v_slug_exists
      using v_slug;
    if v_slug_exists then
      return query select 'slug_conflict'::text, null::uuid, null::text, v_slug;
      return;
    end if;
    v_columns := v_columns || ', slug';
    v_values := v_values || ', ' || quote_literal(v_slug);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organizations' and column_name = 'created_by'
  ) then
    v_columns := v_columns || ', created_by';
    v_values := v_values || ', ' || quote_literal(p_actor_user_id::text) || '::uuid';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organizations' and column_name = 'owner_id'
  ) then
    v_columns := v_columns || ', owner_id';
    v_values := v_values || ', ' || quote_literal(p_actor_user_id::text) || '::uuid';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organizations' and column_name = 'status'
      and is_nullable = 'NO' and column_default is null
  ) then
    v_columns := v_columns || ', status';
    v_values := v_values || ', ' || quote_literal('active');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organizations' and column_name = 'plan'
      and is_nullable = 'NO' and column_default is null
  ) then
    v_columns := v_columns || ', plan';
    v_values := v_values || ', ' || quote_literal('enterprise');
  end if;

  select string_agg(column_name, ', ' order by ordinal_position)
  into v_unsupported
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'organizations'
    and is_nullable = 'NO'
    and column_default is null
    and is_identity = 'NO'
    and column_name not in ('id','name','slug','created_by','owner_id','status','plan');

  if v_unsupported is not null then
    return query select 'schema_unsupported'::text, null::uuid, null::text, null::text;
    return;
  end if;

  execute format(
    'insert into public.organizations (%s) values (%s) returning id',
    v_columns,
    v_values
  ) into v_organization_id;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    v_organization_id,
    p_actor_user_id,
    'enterprise.organization_created',
    'organization',
    v_organization_id::text,
    jsonb_build_object('name', v_name, 'slug', v_slug, 'source', 'platform_control_center')
  );

  return query select 'created'::text, v_organization_id, v_name, v_slug;
exception
  when unique_violation then
    return query select 'slug_conflict'::text, null::uuid, null::text, v_slug;
end;
$$;

revoke all on function public.create_platform_enterprise_organization_atomic(text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_platform_enterprise_organization_atomic(text, text, uuid) to service_role;

notify pgrst, 'reload schema';

commit;
