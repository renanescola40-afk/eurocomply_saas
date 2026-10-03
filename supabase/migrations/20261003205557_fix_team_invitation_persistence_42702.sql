begin;

-- Hotfix: eliminate PL/pgSQL output-parameter ambiguity in the Enterprise
-- invitation authority. The RETURNS TABLE signature exposes organization_id as
-- a PL/pgSQL variable, so ON CONFLICT (organization_id) is ambiguous (SQLSTATE
-- 42702). Target the known primary-key constraint explicitly instead.
do $hotfix$
declare
  fn_oid oid := to_regprocedure(
    'public.create_organization_invitation_with_seat_atomic_reconciled(uuid,text,text,text,text,uuid,timestamptz)'
  );
  fn_def text;
  patched_def text;
  old_fragment constant text := 'on conflict (organization_id) do nothing;';
  new_fragment constant text := 'on conflict on constraint organization_usage_pkey do nothing;';
begin
  if fn_oid is null then
    raise exception 'enterprise invitation reconciled function is missing';
  end if;

  select pg_get_functiondef(fn_oid) into fn_def;

  if position(old_fragment in lower(fn_def)) = 0 then
    if position(new_fragment in lower(fn_def)) > 0 then
      -- Idempotent re-application.
      return;
    end if;
    raise exception 'expected ambiguous ON CONFLICT fragment was not found';
  end if;

  patched_def := replace(fn_def, old_fragment, new_fragment);

  if patched_def = fn_def then
    raise exception 'enterprise invitation 42702 hotfix produced no change';
  end if;

  execute patched_def;
end
$hotfix$;

do $verify$
declare
  fn_oid oid := to_regprocedure(
    'public.create_organization_invitation_with_seat_atomic_reconciled(uuid,text,text,text,text,uuid,timestamptz)'
  );
  fn_def text;
begin
  if fn_oid is null then
    raise exception 'enterprise invitation reconciled function missing after hotfix';
  end if;

  select lower(pg_get_functiondef(fn_oid)) into fn_def;

  if position('on conflict (organization_id) do nothing;' in fn_def) > 0 then
    raise exception 'ambiguous invitation ON CONFLICT remains after hotfix';
  end if;

  if position('on conflict on constraint organization_usage_pkey do nothing;' in fn_def) = 0 then
    raise exception 'constraint-qualified invitation ON CONFLICT is missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
    where p.oid = fn_oid
      and p.prosecdef
      and setting = 'search_path=pg_catalog, public'
  ) then
    raise exception 'enterprise invitation reconciled function security boundary changed';
  end if;

  if has_function_privilege('anon', fn_oid, 'EXECUTE')
     or has_function_privilege('authenticated', fn_oid, 'EXECUTE')
     or has_function_privilege('service_role', fn_oid, 'EXECUTE') then
    raise exception 'reconciled implementation unexpectedly became externally executable';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
