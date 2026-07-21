begin;

create or replace function public.upsert_enterprise_sso_connection_atomic(
  p_organization_id uuid,
  p_connection_id uuid,
  p_supabase_provider_id uuid,
  p_issuer text,
  p_metadata_url text,
  p_verified_domain text,
  p_default_role text,
  p_default_seat_type text,
  p_enforce_sso boolean,
  p_auto_provision boolean,
  p_actor_user_id uuid
)
returns table (
  outcome text,
  connection_id uuid,
  organization_id uuid,
  connection_status text,
  verified_domain text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := lower(trim(coalesce(p_verified_domain, '')));
  v_issuer text := trim(coalesce(p_issuer, ''));
  v_metadata_url text := trim(coalesce(p_metadata_url, ''));
  v_role text := lower(trim(coalesce(p_default_role, '')));
  v_seat text := lower(trim(coalesce(p_default_seat_type, '')));
  v_connection public.enterprise_identity_connections%rowtype;
  v_snapshot record;
begin
  if p_organization_id is null
    or p_supabase_provider_id is null
    or p_actor_user_id is null
    or char_length(v_issuer) not between 3 and 1000
    or v_metadata_url !~ '^https://'
    or v_domain !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
    or v_role not in ('admin','editor','viewer')
    or v_seat not in ('full','participant','viewer') then
    return query select 'invalid_input'::text, null::uuid, p_organization_id, null::text, null::text;
    return;
  end if;

  if not exists (
    select 1
    from public.platform_admin_users as actor
    where actor.user_id = p_actor_user_id
      and actor.enabled = true
      and actor.role in ('owner','platform_owner','platform_admin','platform_security')
  ) then
    return query select 'platform_role_required'::text, null::uuid, p_organization_id, null::text, null::text;
    return;
  end if;

  select * into v_snapshot
  from public.resolve_organization_entitlements_v3(p_organization_id);

  if v_snapshot.outcome is distinct from 'resolved' or v_snapshot.sso_enabled is distinct from true then
    return query select 'sso_not_entitled'::text, null::uuid, p_organization_id, null::text, v_domain;
    return;
  end if;

  if exists (
    select 1
    from public.enterprise_identity_connections as conflicting
    where conflicting.status = 'active'
      and conflicting.id is distinct from p_connection_id
      and (
        conflicting.supabase_provider_id = p_supabase_provider_id
        or lower(coalesce(conflicting.verified_domain, '')) = v_domain
      )
  ) then
    return query select 'binding_conflict'::text, null::uuid, p_organization_id, null::text, v_domain;
    return;
  end if;

  if p_connection_id is null then
    insert into public.enterprise_identity_connections (
      organization_id,
      protocol,
      status,
      issuer,
      metadata_url,
      verified_domain,
      supabase_provider_id,
      default_role,
      default_seat_type,
      enforce_sso,
      auto_provision,
      created_by,
      verified_by,
      verified_at
    ) values (
      p_organization_id,
      'saml',
      'active',
      v_issuer,
      v_metadata_url,
      v_domain,
      p_supabase_provider_id,
      v_role,
      v_seat,
      coalesce(p_enforce_sso, false),
      coalesce(p_auto_provision, true),
      p_actor_user_id,
      p_actor_user_id,
      now()
    ) returning * into v_connection;
  else
    update public.enterprise_identity_connections as connection
    set
      protocol = 'saml',
      status = 'active',
      issuer = v_issuer,
      metadata_url = v_metadata_url,
      verified_domain = v_domain,
      supabase_provider_id = p_supabase_provider_id,
      default_role = v_role,
      default_seat_type = v_seat,
      enforce_sso = coalesce(p_enforce_sso, false),
      auto_provision = coalesce(p_auto_provision, true),
      verified_by = p_actor_user_id,
      verified_at = now(),
      updated_at = now()
    where connection.id = p_connection_id
      and connection.organization_id = p_organization_id
    returning * into v_connection;

    if not found then
      return query select 'not_found'::text, null::uuid, p_organization_id, null::text, v_domain;
      return;
    end if;
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_organization_id,
    p_actor_user_id,
    'enterprise.sso_connection_configured',
    'enterprise_identity_connection',
    v_connection.id::text,
    jsonb_build_object(
      'provider_id', v_connection.supabase_provider_id,
      'verified_domain', v_connection.verified_domain,
      'default_role', v_connection.default_role,
      'default_seat_type', v_connection.default_seat_type,
      'enforce_sso', v_connection.enforce_sso,
      'auto_provision', v_connection.auto_provision
    )
  );

  return query select
    'configured'::text,
    v_connection.id,
    v_connection.organization_id,
    v_connection.status,
    v_connection.verified_domain;
end;
$$;

revoke all on function public.upsert_enterprise_sso_connection_atomic(uuid, uuid, uuid, text, text, text, text, text, boolean, boolean, uuid) from public, anon, authenticated;
grant execute on function public.upsert_enterprise_sso_connection_atomic(uuid, uuid, uuid, text, text, text, text, text, boolean, boolean, uuid) to service_role;

notify pgrst, 'reload schema';

commit;
