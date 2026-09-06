begin;

-- Billing closure: the public catalog advertises storage capacity alongside the
-- already-enforced document-count quota. Keep both decisions in the same
-- PostgreSQL INSERT boundary so concurrent uploads cannot oversubscribe either
-- resource. Historical migrations remain immutable; this forward migration only
-- replaces the current trigger function with the stricter contract.

do $prerequisites$
begin
  if to_regclass('public.documents') is null
     or to_regprocedure('app_private.resolve_commercial_plan(uuid)') is null
     or to_regprocedure('app_private.has_commercial_authority(uuid)') is null
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'documents' and column_name = 'size_bytes'
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'documents' and column_name = 'file_size'
     ) then
    raise exception 'document storage quota prerequisites are missing';
  end if;
end
$prerequisites$;

create or replace function app_private.enforce_document_commercial_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_document_limit bigint;
  v_storage_limit_bytes bigint;
  v_document_count bigint;
  v_storage_bytes bigint;
  v_new_bytes bigint;
begin
  if new.organization_id is null then
    raise exception using
      errcode = '23514',
      message = 'document organization is required';
  end if;

  -- Service-role application writes bypass RLS. Reassert durable paid authority
  -- inside the database write boundary before consulting any plan capacity.
  if not app_private.has_commercial_authority(new.organization_id) then
    raise exception using
      errcode = '42501',
      message = 'document_subscription_required';
  end if;

  v_plan := app_private.resolve_commercial_plan(new.organization_id);
  if v_plan is null then
    raise exception using
      errcode = '42501',
      message = 'document_commercial_plan_unavailable';
  end if;

  -- Canonical limits from src/lib/billing/plans.ts. Public copy says GB, so use
  -- decimal gigabytes exactly (1 GB = 1,000,000,000 bytes) instead of silently
  -- granting a larger GiB allowance.
  select limits.document_limit, limits.storage_limit_bytes
    into v_document_limit, v_storage_limit_bytes
  from (
    values
      ('starter'::text,      100::bigint,  10000000000::bigint),
      ('professional'::text, 1000::bigint, 100000000000::bigint),
      ('business'::text,     10000::bigint, 500000000000::bigint),
      ('enterprise'::text,   null::bigint, null::bigint)
  ) as limits(plan, document_limit, storage_limit_bytes)
  where limits.plan = v_plan;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'document_commercial_plan_unavailable';
  end if;

  -- All document quota-changing INSERTs for one tenant serialize on the same
  -- transaction lock already used by the count authority. The query and INSERT
  -- therefore form one concurrency-safe capacity decision.
  perform pg_advisory_xact_lock(hashtext(new.organization_id::text));

  select
    count(*)::bigint,
    coalesce(sum(greatest(coalesce(document.size_bytes, 0), coalesce(document.file_size, 0))), 0)::bigint
  into v_document_count, v_storage_bytes
  from public.documents document
  where document.organization_id = new.organization_id;

  v_new_bytes := greatest(coalesce(new.size_bytes, 0), coalesce(new.file_size, 0), 0)::bigint;

  if v_document_limit is not null and v_document_count >= v_document_limit then
    raise exception using
      errcode = 'P0001',
      message = 'document_quota_exceeded',
      detail = format(
        'organization=%s plan=%s current=%s limit=%s',
        new.organization_id,
        v_plan,
        v_document_count,
        v_document_limit
      );
  end if;

  if v_storage_limit_bytes is not null
     and v_storage_bytes + v_new_bytes > v_storage_limit_bytes then
    raise exception using
      errcode = 'P0001',
      message = 'document_storage_quota_exceeded',
      detail = format(
        'organization=%s plan=%s current_bytes=%s requested_bytes=%s limit_bytes=%s',
        new.organization_id,
        v_plan,
        v_storage_bytes,
        v_new_bytes,
        v_storage_limit_bytes
      );
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_document_commercial_quota() from public, anon, authenticated;
grant execute on function app_private.enforce_document_commercial_quota() to service_role;

-- Recreate explicitly so this forward migration remains self-contained even if
-- a partially-reconciled environment lost the trigger while retaining function
-- definitions.
drop trigger if exists enforce_document_commercial_quota on public.documents;
create trigger enforce_document_commercial_quota
before insert on public.documents
for each row
execute function app_private.enforce_document_commercial_quota();

comment on function app_private.enforce_document_commercial_quota() is
  'Fail-closed serialized document INSERT authority: paid plan, document count and persisted storage-byte quota in one tenant lock.';

do $verify$
declare
  quota_oid oid := to_regprocedure('app_private.enforce_document_commercial_quota()');
begin
  if quota_oid is null then
    raise exception 'document commercial quota function is missing';
  end if;

  if has_function_privilege('anon', quota_oid, 'EXECUTE')
     or has_function_privilege('authenticated', quota_oid, 'EXECUTE')
     or not has_function_privilege('service_role', quota_oid, 'EXECUTE') then
    raise exception 'document commercial quota execution privileges are not canonical';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.documents'::regclass
      and tgname = 'enforce_document_commercial_quota'
      and not tgisinternal
  ) then
    raise exception 'document commercial quota trigger is missing';
  end if;
end
$verify$;

commit;
