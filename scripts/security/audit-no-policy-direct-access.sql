-- Read-only inventory. A missing policy is not inherently a vulnerability.
-- Review intentional backend-only tables against application RPC and service-role paths.
with no_policy as (
 select c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r'
 and not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=c.relname)
)
select relname as table_name,relrowsecurity as rls_enabled,
 relforcerowsecurity as force_rls_enabled,
 has_table_privilege('anon',oid,'SELECT') as anon_select,
 has_table_privilege('authenticated',oid,'SELECT') as auth_select,
 has_table_privilege('authenticated',oid,'INSERT') as auth_insert,
 has_table_privilege('authenticated',oid,'UPDATE') as auth_update,
 has_table_privilege('authenticated',oid,'DELETE') as auth_delete
from no_policy order by relname;
