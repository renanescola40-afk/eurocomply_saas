begin;

-- Final invitation-acceptance SQLSTATE 42702 closure.
-- Both acceptance functions return organization_id, so the organization_members
-- conflict inference list is ambiguous inside PL/pgSQL. Bind it to the canonical
-- unique constraint instead.
do $hotfix$
declare
  target regprocedure;
  target_name text;
  fn_def text;
  patched_def text;
  old_fragment constant text := 'on conflict (organization_id, user_id) do update set';
  new_fragment constant text := 'on conflict on constraint organization_members_organization_id_user_id_key do update set';
begin
  foreach target_name in array array[
    'public.accept_organization_invitation_atomic(text,uuid,text)',
    'public.accept_billing_organization_invitation_atomic(text,uuid,text)'
  ]
  loop
    target := to_regprocedure(target_name);
    if target is null then
      raise exception 'required invitation acceptance function is missing: %', target_name;
    end if;

    select pg_get_functiondef(target) into fn_def;

    if position(old_fragment in lower(fn_def)) = 0 then
      if position(new_fragment in lower(fn_def)) > 0 then
        continue;
      end if;
      raise exception 'expected membership conflict fragment was not found in %', target_name;
    end if;

    patched_def := replace(fn_def, old_fragment, new_fragment);
    if patched_def = fn_def then
      raise exception 'membership conflict hotfix produced no change for %', target_name;
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
    'public.accept_billing_organization_invitation_atomic(text,uuid,text)'
  ]
  loop
    target := to_regprocedure(target_name);
    if target is null then
      raise exception 'required invitation acceptance function missing after hotfix: %', target_name;
    end if;

    select lower(pg_get_functiondef(target)) into fn_def;

    if position('on conflict (organization_id, user_id) do update set' in fn_def) > 0 then
      raise exception 'ambiguous membership conflict target remains in %', target_name;
    end if;

    if position('on conflict on constraint organization_members_organization_id_user_id_key do update set' in fn_def) = 0 then
      raise exception 'constraint-qualified membership conflict target missing in %', target_name;
    end if;

    if not exists (
      select 1
      from pg_proc p
      cross join lateral unnest(coalesce(p.proconfig, array[]::text[])) setting
      where p.oid = target
        and p.prosecdef
        and setting = 'search_path=pg_catalog, public'
    ) then
      raise exception 'invitation acceptance security boundary changed for %', target_name;
    end if;
  end loop;
end
$verify$;

notify pgrst, 'reload schema';
commit;
