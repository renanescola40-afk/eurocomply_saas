-- Read-only metadata audit for deployment review; does not mutate database.
-- Inspect results before deciding whether any grants need adjustment.
select n.nspname as schema_name,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as function_arguments,
       pg_get_userbyid(p.proowner) as function_owner,
       p.prosecdef as security_definer,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_execute,
       -- PUBLIC is a PostgreSQL ACL pseudo-role (grantee OID 0), not a pg_roles login.
       -- The effective default EXECUTE grant must also be accounted for when proacl is NULL.
       exists (
         select 1
         from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as grants
         where grants.grantee = 0
           and grants.privilege_type = 'EXECUTE'
       ) as public_can_execute,
       p.proconfig as settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef and n.nspname in ('public','app_private')
order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid);
