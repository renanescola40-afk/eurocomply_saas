begin;

-- A composite FK with ON DELETE SET NULL would attempt to null every referencing
-- column, including organization_id. Keep tenant identity immutable and require
-- operators to revoke/suspend an identity connection before later cleanup.
alter table public.enterprise_scim_identities
  drop constraint if exists enterprise_scim_identities_connection_tenant_fk;

alter table public.enterprise_scim_identities
  add constraint enterprise_scim_identities_connection_tenant_fk
  foreign key (identity_connection_id, organization_id)
  references public.enterprise_identity_connections(id, organization_id)
  on delete restrict;

do $verify$
declare
  delete_action "char";
begin
  select constraint_row.confdeltype
    into delete_action
  from pg_constraint as constraint_row
  where constraint_row.conrelid = 'public.enterprise_scim_identities'::regclass
    and constraint_row.conname = 'enterprise_scim_identities_connection_tenant_fk'
    and constraint_row.contype = 'f'
    and constraint_row.convalidated;

  if delete_action is distinct from 'r' then
    raise exception 'SCIM identity connection tenant FK must restrict parent deletes';
  end if;
end
$verify$;

commit;
