\set ON_ERROR_STOP on
\pset pager off
\pset footer off
\pset format unaligned
\pset fieldsep '|'

begin transaction read only;
set local statement_timeout = '60s';
set local lock_timeout = '5s';

select 'metadata', current_database(), current_user, version();

select 'table', n.nspname, c.relname, c.relkind,
       c.relrowsecurity, c.relforcerowsecurity,
       pg_get_userbyid(c.relowner)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage')
  and c.relkind in ('r','p','v','m')
order by n.nspname, c.relname;

select 'column', cols.table_schema, cols.table_name, cols.ordinal_position,
       cols.column_name, cols.data_type, cols.udt_name, cols.is_nullable,
       coalesce(cols.column_default, ''),
       pg_catalog.format_type(attr.atttypid, attr.atttypmod),
       coalesce(cols.character_maximum_length::text, ''),
       coalesce(cols.numeric_precision::text, ''),
       coalesce(cols.numeric_scale::text, ''),
       coalesce(cols.datetime_precision::text, ''),
       coalesce(cols.is_identity, ''),
       coalesce(cols.identity_generation, ''),
       coalesce(cols.is_generated, ''),
       coalesce(cols.generation_expression, ''),
       coalesce(cols.collation_schema, ''),
       coalesce(cols.collation_name, ''),
       coalesce(cols.domain_schema, ''),
       coalesce(cols.domain_name, '')
from information_schema.columns cols
join pg_namespace n
  on n.nspname = cols.table_schema
join pg_class cls
  on cls.relnamespace = n.oid
 and cls.relname = cols.table_name
join pg_attribute attr
  on attr.attrelid = cls.oid
 and attr.attname = cols.column_name
 and attr.attnum = cols.ordinal_position
 and not attr.attisdropped
where cols.table_schema in ('public', 'storage')
order by cols.table_schema, cols.table_name, cols.ordinal_position;

select 'constraint', n.nspname, c.relname, con.conname, con.contype,
       pg_get_constraintdef(con.oid, true)
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage')
order by n.nspname, c.relname, con.conname;

select 'constraint_state', n.nspname, c.relname, con.conname,
       con.convalidated, con.condeferrable, con.condeferred,
       con.confmatchtype, con.confupdtype, con.confdeltype
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage')
order by n.nspname, c.relname, con.conname;

select 'index', schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname in ('public', 'storage')
order by schemaname, tablename, indexname;

select 'function', n.nspname, p.proname,
       pg_get_function_identity_arguments(p.oid),
       pg_get_function_result(p.oid),
       p.prosecdef,
       p.provolatile,
       pg_get_userbyid(p.proowner),
       coalesce(array_to_string(p.proconfig, ','), '')
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'storage')
order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid);

select 'trigger', event_object_schema, event_object_table, trigger_name,
       event_manipulation, action_timing, action_orientation,
       action_statement
from information_schema.triggers
where event_object_schema in ('public', 'storage')
order by event_object_schema, event_object_table, trigger_name, event_manipulation;

select 'policy', schemaname, tablename, policyname, permissive,
       array_to_string(roles, ','), cmd,
       coalesce(qual, ''), coalesce(with_check, '')
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

select 'grant', table_schema, table_name, grantee, privilege_type,
       is_grantable
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
order by table_schema, table_name, grantee, privilege_type;

select 'sequence', sequence_schema, sequence_name, data_type,
       start_value, minimum_value, maximum_value, increment
from information_schema.sequences
where sequence_schema in ('public', 'storage')
order by sequence_schema, sequence_name;

select 'migration', version, coalesce(name, '')
from supabase_migrations.schema_migrations
order by version;

rollback;
