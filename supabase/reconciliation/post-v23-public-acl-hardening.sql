begin;

-- Candidate forward-only canonicalization for restrictive Production ACL state.
--
-- IMPORTANT:
-- - This file is intentionally outside supabase/migrations/.
-- - It is NOT part of the governed V23/33 manifest and MUST NOT be injected into V23.
-- - Promote it to a real migration only through the repository's official Supabase
--   migration-generation path after V23/recovery replay interaction is proven.
-- - It only removes CREATE/default privileges from PUBLIC/anon/authenticated;
--   it does not grant new access and does not alter existing object grants or RLS.

revoke create on schema public from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all privileges on tables from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all privileges on functions from public, anon, authenticated;

do $acl_postconditions$
declare
  forbidden_schema_create integer := 0;
  forbidden_default_acl integer := 0;
begin
  select count(*)
    into forbidden_schema_create
  from pg_namespace n
  cross join lateral aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a
  where n.nspname = 'public'
    and a.privilege_type = 'CREATE'
    and (
      a.grantee = 0
      or pg_get_userbyid(a.grantee) in ('anon', 'authenticated')
    );

  if forbidden_schema_create <> 0 then
    raise exception 'public schema CREATE remains available to PUBLIC/anon/authenticated';
  end if;

  select count(*)
    into forbidden_default_acl
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral aclexplode(d.defaclacl) a
  where pg_get_userbyid(d.defaclrole) = 'postgres'
    and n.nspname = 'public'
    and d.defaclobjtype in ('r', 'S', 'f')
    and (
      a.grantee = 0
      or pg_get_userbyid(a.grantee) in ('anon', 'authenticated')
    );

  if forbidden_default_acl <> 0 then
    raise exception 'postgres public-schema default ACL still exposes future objects to PUBLIC/anon/authenticated';
  end if;
end
$acl_postconditions$;

commit;
