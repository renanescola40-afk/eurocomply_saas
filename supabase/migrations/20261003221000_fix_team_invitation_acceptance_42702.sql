begin;

-- Close the remaining invitation-path SQLSTATE 42702 hazards.
-- Each target function RETURNS TABLE(... organization_id ...), making the
-- unqualified ON CONFLICT (organization_id) identifier ambiguous in PL/pgSQL.
do $hotfix$
declare
  target regprocedure;
  target_name text;
  fn_def text;
  patched_def text;
  old_fragment constant text := 'on conflict (organization_id) do nothing;';
  new_fragment constant text := 'on conflict on constraint organization_usage_pkey do nothing;';
begin
  foreach target_name in array array[
    'public.accept_organization_invitation_atomic(text,uuid,text)',
    'public.accept_billing_organization_invitation_atomic(text,uuid,text)',
    'public.create_billing_organization_invitation_atomic(uuid,text,text,text,text,uuid,timestamptz)'
  ]
  loop
    target := to_regprocedure(target_name);
    if target is null then
      raise exception 'required invitation function is missing: %', target_name;
    end if;

    select pg_get_functiondef(target) into fn_def;

    if position(old_fragment in lower(fn_def)) = 0 then
      if position(new_fragment in lower(fn_def)) > 0 then
        continue;
      end if;
      raise exception 'expected ambiguous ON CONFLICT fragment was not found in %', target_name;
    end if;

    patched_def := replace(fn_def, old_fragment, new_fragment);
    if patched_def = fn_def then
      raise exception 'invitation 42702 hotfix produced no change for %', target_name;
    end if;

    execute patched_def;
  end loop;
end
$hotfix$;

do $verify$
declare
  target regprocedure;
  target_name text;
  fn_def text;
begin
  foreach target_name in array array[
    'public.accept_organization_invitation_atomic(text,uuid,text)',
    'public.accept_billing_organization_invitation_atomic(text,uuid,text)',
    'public.create_billing_organization_invitation_atomic(uuid,text,text,text,text,uuid,timestamptz)'
  ]
  loop
    target := to_regprocedure(target_name);
    if target is null then
      raise exception 'required invitation function missing after hotfix: %', target_name;
    end if;

    select lower(pg_get_functiondef(target)) into fn_def;

    if position('on conflict (organization_id) do nothing;' in fn_def) > 0 then
      raise exception 'ambiguous invitation ON CONFLICT remains in %', target_name;
    end if;

    if position('on conflict on constraint organization_usage_pkey do nothing;' in fn_def) = 0 then
      raise exception 'constraint-qualified invitation ON CONFLICT missing in %', target_name;
    end if;

    if not exists (
      select 1
      from pg_proc p
      cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
      where p.oid = target
        and p.prosecdef
        and setting = 'search_path=pg_catalog, public'
    ) then
      raise exception 'invitation function security boundary changed for %', target_name;
    end if;
  end loop;
end
$verify$;

notify pgrst, 'reload schema';
commit;
