\set ON_ERROR_STOP on

begin;

create temporary table integration_runtime_results (
  control_id text primary key,
  passed boolean not null,
  detail text not null
);

insert into integration_runtime_results
select 'INT-SCHEMA', count(*) = 7, format('tables=%s', count(*))
from pg_tables
where schemaname = 'public'
  and tablename in (
    'enterprise_service_accounts','enterprise_api_keys','enterprise_webhook_subscriptions',
    'enterprise_webhook_deliveries','enterprise_identity_connections','enterprise_scim_tokens',
    'enterprise_integration_audit_events'
  );

insert into integration_runtime_results
select 'INT-RLS', count(*) = 7 and bool_and(c.relrowsecurity and c.relforcerowsecurity),
       format('protected_tables=%s', count(*))
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'enterprise_service_accounts','enterprise_api_keys','enterprise_webhook_subscriptions',
    'enterprise_webhook_deliveries','enterprise_identity_connections','enterprise_scim_tokens',
    'enterprise_integration_audit_events'
  );

insert into integration_runtime_results
select 'INT-TENANT-FK', count(*) >= 5, format('composite_fks=%s', count(*))
from pg_constraint
where contype = 'f'
  and conname in (
    'enterprise_api_keys_service_account_tenant_fk',
    'enterprise_api_keys_rotation_tenant_fk',
    'enterprise_webhook_deliveries_subscription_tenant_fk',
    'enterprise_scim_tokens_connection_tenant_fk',
    'enterprise_integration_audit_service_account_tenant_fk'
  );

insert into integration_runtime_results
select 'INT-AUDIT-IMMUTABLE',
       not has_table_privilege('authenticated', 'public.enterprise_integration_audit_events', 'UPDATE')
       and not has_table_privilege('authenticated', 'public.enterprise_integration_audit_events', 'DELETE'),
       'authenticated update/delete revoked';

insert into integration_runtime_results
select 'INT-CREDENTIAL-DIGEST',
       exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='enterprise_api_keys' and column_name='secret_hash'
       ) and exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name='enterprise_scim_tokens' and column_name='token_hash'
       ),
       'digest columns present';

select jsonb_pretty(jsonb_build_object(
  'schema_version', 1,
  'status', case when bool_and(passed) then 'PASS' else 'FAIL' end,
  'controls', jsonb_agg(jsonb_build_object('id', control_id, 'passed', passed, 'detail', detail) order by control_id)
))
from integration_runtime_results;

\if :{?evidence_path}
\copy (select jsonb_pretty(jsonb_build_object('schema_version',1,'status',case when bool_and(passed) then 'PASS' else 'FAIL' end,'controls',jsonb_agg(jsonb_build_object('id',control_id,'passed',passed,'detail',detail) order by control_id))) from integration_runtime_results) to :'evidence_path'
\endif

do $$
begin
  if exists (select 1 from integration_runtime_results where not passed) then
    raise exception 'enterprise integrations runtime validation failed';
  end if;
end $$;

rollback;
